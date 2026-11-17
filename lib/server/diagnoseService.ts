import { createHash } from "node:crypto";
import { DIAGNOSIS_PROMPT_VERSION, buildDiagnosisPrompt, type DiagnosisRequest } from "./ai";
import type { DiagnosisProvider } from "./provider";
import { startDiagnosisTrace } from "./tracing";
import {
  QuotaExhaustedError,
  countdownMessage,
  quotaStateFor,
  type QuotaState,
} from "./quota";
import type { IdentityStore, UserRecord } from "./store";

/**
 * Diagnosis orchestration (WP5) — the one path every authenticated
 * diagnosis takes, shared by the HTTP route and the test-suite:
 *
 *   1. TIER GATE — the deep (Sonnet-class) tier is Pro-only.
 *   2. QUOTA CONSUME — free plan: one atomic consume in the store. If it
 *      fails, QuotaExhaustedError is thrown and NOTHING else runs: no
 *      cache read, no provider call, no paid AI spend. Pro: bypass.
 *   3. CACHE — exact-match lookup (identical normalized problem +
 *      vehicle + language + tier). A hit skips the provider entirely.
 *   4. STREAM — provider deltas flow through; the terminal event carries
 *      the parsed report, the latency measurement, and the quota state
 *      AFTER this diagnosis (the countdown the user sees).
 *   5. PERSIST — cache the answer; save the diagnosis record against
 *      the account ALWAYS (Pass 15 / migration 0016), linked to the
 *      named vehicle when the request carried a vehicleId and carrying
 *      the vehicle string either way, so the Vault history and the
 *      recent list show every run.
 *
 * Ordering note (owner's rule): the consume happens BEFORE the provider
 * call. If the provider then fails mid-stream, the slot stays consumed —
 * that is the stated rule, and it is what makes a blocked user
 * structurally unable to burn paid AI calls.
 */

export type DiagnoseServiceEvent =
  | { type: "quota"; quota: QuotaState; message: string }
  | { type: "delta"; text: string }
  | {
      type: "done";
      report: unknown;
      model: string;
      tier: string;
      source: "model" | "cache";
      latency: { ttftMs: number; totalMs: number } | null;
      quota: QuotaState;
      message: string;
    };

export class ProRequiredError extends Error {
  readonly code = "pro_required";
  constructor() {
    super("The deep diagnosis tier is a MECHA Pro feature.");
    this.name = "ProRequiredError";
  }
}

export function diagnosisCacheKey(req: DiagnosisRequest): string {
  const normalized = JSON.stringify({
    problem: req.problem.trim().toLowerCase(),
    vehicleInfo: (req.vehicleInfo ?? "").trim().toLowerCase(),
    language: (req.language ?? "en").trim().toLowerCase(),
    tier: req.tier === "deep" ? "deep" : "triage",
  });
  return createHash("sha256").update(normalized).digest("hex");
}

export interface DiagnoseDeps {
  store: IdentityStore;
  provider: DiagnosisProvider;
}

export async function* executeDiagnosis(
  deps: DiagnoseDeps,
  input: { user: UserRecord; request: DiagnosisRequest; vehicleId?: string },
): AsyncGenerator<DiagnoseServiceEvent> {
  const { store, provider } = deps;
  const { user, request } = input;
  const tier = request.tier === "deep" ? "deep" : "triage";

  // No phone gate (owner's rules, 2026-11-16): an ACCOUNT is the
  // diagnosis requirement — the routes refuse signed-out calls with
  // 401 before this service runs — and the free count keys on the
  // account record. A phone number is optional profile data (the
  // dashboard's dismissible card collects it); it never blocks a
  // signed-in account from diagnosing.

  // 1. Tier gate.
  if (tier === "deep" && user.plan !== "pro") throw new ProRequiredError();

  // 2. Quota consume — BEFORE anything that could cost money.
  let usedAfter = user.freeDiagnosesUsed;
  if (user.plan !== "pro") {
    const result = await store.consumeFreeDiagnosis(user.id);
    if (!result.consumed) {
      throw new QuotaExhaustedError(
        quotaStateFor({ plan: user.plan, freeDiagnosesUsed: result.used }),
      );
    }
    usedAfter = result.used;
  }
  const quotaAfter = quotaStateFor({ plan: user.plan, freeDiagnosesUsed: usedAfter });
  yield { type: "quota", quota: quotaAfter, message: countdownMessage(quotaAfter.remaining) };

  // PERSIST (step 5, hoisted): EVERY completed run saves a diagnosis
  // record against the account — linked to the named vehicle when the
  // request carried one, unlinked (vehicleId null) with the vehicle
  // string otherwise. Before Pass 15 the record was saved ONLY when a
  // vehicleId arrived, and no form ever sent one — so real diagnoses
  // ran, consumed quota, and left no history anywhere (the Vault read
  // "No diagnoses saved for this vehicle yet" for cars diagnosed
  // repeatedly). Persistence must never fail a diagnosis the owner
  // already paid for: save errors are logged, not thrown.
  const persistRecord = async (report: unknown): Promise<void> => {
    try {
      await store.saveDiagnosisRecord({
        userId: user.id,
        vehicleId: input.vehicleId ?? null,
        vehicleInfo: request.vehicleInfo ?? null,
        problemText: request.problem,
        imageUrl: request.imageUrl,
        aiResult: report,
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "diagnosis_persistence_warning",
          detail: err instanceof Error ? err.message : "unknown",
        }),
      );
    }
  };

  // 3. Cache — identical question, identical answer, zero AI spend.
  // A cache hit is still a run the driver made: it saves a record too
  // (linked the same way), so history shows every consumed run.
  const cacheKey = diagnosisCacheKey(request);
  const cached = await store.getCachedDiagnosis(cacheKey);
  if (cached) {
    await persistRecord(cached.report);
    yield {
      type: "done",
      report: cached.report,
      model: cached.model,
      tier: cached.tier,
      source: "cache",
      latency: null,
      quota: quotaAfter,
      message: countdownMessage(quotaAfter.remaining),
    };
    return;
  }

  // 4 + 5. Stream the provider, then persist. The Langfuse trace handle
  // is a no-op unless tracing is wired (lib/server/tracing.ts); cache
  // hits above never reach it — no LLM call, nothing to trace.
  const trace = startDiagnosisTrace({
    userId: user.id,
    tier,
    language: request.language,
    promptVersion: DIAGNOSIS_PROMPT_VERSION,
    prompt: buildDiagnosisPrompt(request),
  });
  try {
    for await (const event of provider.stream(request)) {
      if (event.type === "delta") {
        yield { type: "delta", text: event.text };
      } else {
      // Persistence must never fail a diagnosis the owner already paid
      // for: cache/save errors are logged, not thrown.
      try {
        await store.putCachedDiagnosis(cacheKey, {
          report: event.report,
          model: event.model,
          tier: event.tier,
        });
      } catch (err) {
        console.error(
          JSON.stringify({
            event: "diagnosis_persistence_warning",
            detail: err instanceof Error ? err.message : "unknown",
          }),
        );
      }
      await persistRecord(event.report);
      // Trace BEFORE the done yield: consumers stop iterating at done,
      // so anything after the yield is not guaranteed to run. The call
      // is a no-op when Langfuse is unwired and can never throw.
      await trace.recordSuccess({
        model: event.model,
        report: event.report,
        usage: event.usage,
        latency: event.latency,
      });
      yield {
        type: "done",
        report: event.report,
        model: event.model,
        tier: event.tier,
        source: "model",
        latency: {
          ttftMs: Math.round(event.latency.ttftMs),
          totalMs: Math.round(event.latency.totalMs),
        },
        quota: quotaAfter,
        message: countdownMessage(quotaAfter.remaining),
      };
      }
    }
  } catch (err) {
    await trace.recordError(err);
    throw err;
  }
}
