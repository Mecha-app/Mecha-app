import { createHash } from "node:crypto";
import type { DiagnosisRequest } from "./ai";
import type { DiagnosisProvider } from "./provider";
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
 *   5. PERSIST — cache the answer; save the diagnosis record when the
 *      request names one of the user's vehicles (repo model: vehicle is
 *      required for a saved diagnosis).
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

  // 3. Cache — identical question, identical answer, zero AI spend.
  const cacheKey = diagnosisCacheKey(request);
  const cached = await store.getCachedDiagnosis(cacheKey);
  if (cached) {
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

  // 4 + 5. Stream the provider, then persist.
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
        if (input.vehicleId) {
          await store.saveDiagnosisRecord({
            userId: user.id,
            vehicleId: input.vehicleId,
            problemText: request.problem,
            imageUrl: request.imageUrl,
            aiResult: event.report,
          });
        }
      } catch (err) {
        console.error(
          JSON.stringify({
            event: "diagnosis_persistence_warning",
            detail: err instanceof Error ? err.message : "unknown",
          }),
        );
      }
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
}
