import { createHash } from "node:crypto";
import { DIAGNOSIS_PROMPT_VERSION, buildDiagnosisPrompt, type DiagnosisRequest, type DiagnosisTier } from "./ai";
import type { DiagnosisProvider } from "./provider";
import { startDiagnosisTrace } from "./tracing";
import {
  QuotaExhaustedError,
  countdownMessage,
  quotaStateFor,
  type QuotaState,
} from "./quota";
import { monthlyBucketView } from "./credits";
import {
  consumeShopDiagnosis,
  shopCountdownMessage,
  shopPaywallMessage,
  shopQuotaStateFor,
  type ShopQuotaState,
} from "./credits";
import { PRO_MONTHLY_CREDITS } from "./pricing";
import type { IdentityStore, ShopRecord, UserRecord } from "./store";

/**
 * Diagnosis orchestration (WP5) — the one path every authenticated
 * diagnosis takes, shared by the HTTP route and the test-suite:
 *
 *   1. TIER GATE — the deep (Sonnet-class) tier is Pro-only.
 *   2. CONSUMPTION — one diagnosis = one credit, taken in the owner's
 *      order: the lifetime free allowance first, then the Pro monthly
 *      bucket (it expires), then purchased single credits. Each take
 *      is one atomic consume in the store; if none lands,
 *      QuotaExhaustedError is thrown and NOTHING else runs: no cache
 *      read, no provider call, no paid AI spend.
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

type StreamEvent<Q> =
  | { type: "quota"; quota: Q; message: string }
  | { type: "delta"; text: string }
  | {
      type: "done";
      report: unknown;
      model: string;
      tier: string;
      source: "model" | "cache";
      latency: { ttftMs: number; totalMs: number } | null;
      quota: Q;
      message: string;
      /** The saved record's id (Pass #20) — the handle the share
       * link and the outcome prompt work against. Null only when the
       * save itself failed (logged, never thrown). */
      diagnosisId: string | null;
    };

export type DiagnoseServiceEvent = StreamEvent<QuotaState>;

/** The shop stream: identical mechanics, the shop quota shape. */
export type ShopDiagnoseServiceEvent = StreamEvent<ShopQuotaState>;

/** Thrown when a shop has nothing left on any shelf — the trial is
 * over or the plan bucket is spent. Carries the shop state so the
 * route answers 402 with the honest subscribe message. */
export class ShopQuotaExhaustedError extends Error {
  readonly code = "quota_exhausted";
  readonly quota: ShopQuotaState;
  constructor(quota: ShopQuotaState) {
    super(shopPaywallMessage(quota));
    this.name = "ShopQuotaExhaustedError";
    this.quota = quota;
  }
}

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
  const { store } = deps;
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

  // 2. Consumption — BEFORE anything that could cost money, in the
  // owner's order: free lifetime → Pro monthly bucket → purchased
  // singles. The user record is a snapshot; the after-state is tracked
  // locally from each consume's own report so the countdown the driver
  // sees is exact.
  let freeUsedAfter = user.freeDiagnosesUsed;
  let creditsAfter = user.diagnosisCredits;
  let bucketUsedAfter = user.monthlyDiagnosesUsed;
  let bucketAnchorAfter = user.monthlyPeriodStart;
  const stateAfter = (): QuotaState =>
    quotaStateFor({
      plan: user.plan,
      freeDiagnosesUsed: freeUsedAfter,
      purchasedCredits: creditsAfter,
      monthlyDiagnosesUsed: bucketUsedAfter,
      monthlyPeriodStart: bucketAnchorAfter,
    });

  const free = await store.consumeFreeDiagnosis(user.id);
  if (free.consumed) {
    freeUsedAfter = free.used;
  } else {
    freeUsedAfter = free.used;
    let consumed = false;
    if (user.plan === "pro") {
      const now = new Date();
      const before = monthlyBucketView({
        used: user.monthlyDiagnosesUsed,
        periodStart: user.monthlyPeriodStart,
        limit: PRO_MONTHLY_CREDITS,
        now,
      });
      if (await store.consumeMonthlyDiagnosis("user", user.id, PRO_MONTHLY_CREDITS, now)) {
        consumed = true;
        const restarted = before.stale || !user.monthlyPeriodStart;
        bucketUsedAfter = restarted ? 1 : before.used + 1;
        bucketAnchorAfter = restarted ? now.toISOString() : user.monthlyPeriodStart;
      }
    }
    if (!consumed) {
      const credit = await store.consumePurchasedCredit(user.id);
      if (credit.consumed) {
        consumed = true;
        creditsAfter = credit.balance;
      }
    }
    if (!consumed) throw new QuotaExhaustedError(stateAfter());
  }
  const quotaAfter = stateAfter();

  // PERSIST (step 5, hoisted): EVERY completed run saves a diagnosis
  // record against the account — linked to the named vehicle when the
  // request carried one, unlinked (vehicleId null) with the vehicle
  // string otherwise. Before Pass 15 the record was saved ONLY when a
  // vehicleId arrived, and no form ever sent one — so real diagnoses
  // ran, consumed quota, and left no history anywhere (the Vault read
  // "No diagnoses saved for this vehicle yet" for cars diagnosed
  // repeatedly). Persistence must never fail a diagnosis the owner
  // already paid for: save errors are logged, not thrown.
  const persistRecord = async (report: unknown): Promise<string | null> => {
    try {
      const saved = await store.saveDiagnosisRecord({
        userId: user.id,
        vehicleId: input.vehicleId ?? null,
        vehicleInfo: request.vehicleInfo ?? null,
        problemText: request.problem,
        imageUrl: request.imageUrl,
        aiResult: report,
      });
      return saved.id;
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "diagnosis_persistence_warning",
          detail: err instanceof Error ? err.message : "unknown",
        }),
      );
      return null;
    }
  };

  yield* streamDiagnosis(deps, {
    request,
    tier,
    quota: quotaAfter,
    message: countdownMessage(quotaAfter),
    traceId: user.id,
    persistRecord,
  });
}

/**
 * Steps 3–5 of a diagnosis, shared by the driver path above and the
 * shop path below: yield the quota event, serve an exact-match cache
 * hit when one exists, otherwise stream the provider — persisting
 * the finished report through the caller's persistRecord either way.
 */
async function* streamDiagnosis<Q>(
  deps: DiagnoseDeps,
  args: {
    request: DiagnosisRequest;
    tier: DiagnosisTier;
    quota: Q;
    message: string;
    traceId: string;
    persistRecord: (report: unknown) => Promise<string | null>;
  },
): AsyncGenerator<StreamEvent<Q>> {
  const { store, provider } = deps;
  const { request, tier, quota, message, persistRecord } = args;
  yield { type: "quota", quota, message };

  // Cache — identical question, identical answer, zero AI spend. A
  // cache hit is still a run the account made: it saves a record too,
  // so history shows every consumed run.
  const cacheKey = diagnosisCacheKey(request);
  const cached = await store.getCachedDiagnosis(cacheKey);
  if (cached) {
    const cachedDiagnosisId = await persistRecord(cached.report);
    yield {
      type: "done",
      report: cached.report,
      model: cached.model,
      tier: cached.tier,
      source: "cache",
      latency: null,
      quota,
      message,
      diagnosisId: cachedDiagnosisId,
    };
    return;
  }

  // Stream the provider, then persist. The Langfuse trace handle is
  // a no-op unless tracing is wired (lib/server/tracing.ts); cache
  // hits above never reach it — no LLM call, nothing to trace.
  const trace = startDiagnosisTrace({
    userId: args.traceId,
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
        // Persistence must never fail a diagnosis the account already
        // paid for: cache/save errors are logged, not thrown.
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
        const savedDiagnosisId = await persistRecord(event.report);
        // Trace BEFORE the done yield: consumers stop iterating at
        // done, so anything after the yield is not guaranteed to run.
        // The call is a no-op when Langfuse is unwired and can never
        // throw.
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
          quota,
          message,
          diagnosisId: savedDiagnosisId,
        };
      }
    }
  } catch (err) {
    await trace.recordError(err);
    throw err;
  }
}

/**
 * The SHOP diagnosis path (owner addition, 2026-11-19) — a shop
 * diagnoses the cars in its own bays: a customer's car on the lift,
 * a trade-in on the lot, any vehicle the shop types in. Same engine,
 * same cache, same ordering discipline as the driver path —
 * consumption BEFORE the provider call, against the shop's own
 * shelves (lib/server/credits.ts): the free TRIAL pool while the
 * trial is active (14 days / 25 credits, whichever ends first), then
 * the business plan's 500-credit monthly bucket. At zero on every
 * shelf, ShopQuotaExhaustedError — nothing else runs.
 *
 * The vehicle is the shop's typed-in car (vehicleInfo): shops hold
 * no garage of saved vehicles in the data model, so there is no
 * vehicleId link — the record saves against the SHOP (0020), with
 * the vehicle string carried, exactly like a driver's free-text run.
 * The deep tier is the paid tier's: business plan only.
 */
export async function* executeShopDiagnosis(
  deps: DiagnoseDeps,
  input: { shop: ShopRecord; request: DiagnosisRequest },
): AsyncGenerator<ShopDiagnoseServiceEvent> {
  const { store } = deps;
  const { shop, request } = input;
  const tier = request.tier === "deep" ? "deep" : "triage";

  // 1. Tier gate — deep analysis rides the paid plan.
  if (tier === "deep" && shop.plan !== "business") throw new ProRequiredError();

  // 2. Consumption — before anything that could cost money.
  const now = new Date();
  const result = await consumeShopDiagnosis(store, shop, now);
  if (!result.ok) {
    throw new ShopQuotaExhaustedError(shopQuotaStateFor(shop, now));
  }
  // The after-state, tracked from the consume's own report so the
  // countdown the shop sees is exact without a second read.
  const afterShop: ShopRecord = {
    ...shop,
    freeDiagnosesUsed: result.freeUsed,
    monthlyDiagnosesUsed: result.bucket ? result.bucket.used : shop.monthlyDiagnosesUsed,
    monthlyPeriodStart:
      result.source === "monthly" && result.bucket
        ? (shop.monthlyPeriodStart ?? now.toISOString())
        : shop.monthlyPeriodStart,
  };
  const quotaAfter = shopQuotaStateFor(afterShop, now);

  const persistRecord = async (report: unknown): Promise<string | null> => {
    try {
      const saved = await store.saveDiagnosisRecord({
        userId: null,
        shopId: shop.id,
        vehicleId: null,
        vehicleInfo: request.vehicleInfo ?? null,
        problemText: request.problem,
        imageUrl: request.imageUrl,
        aiResult: report,
      });
      return saved.id;
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "diagnosis_persistence_warning",
          detail: err instanceof Error ? err.message : "unknown",
        }),
      );
      return null;
    }
  };

  yield* streamDiagnosis(deps, {
    request,
    tier,
    quota: quotaAfter,
    message: shopCountdownMessage(quotaAfter),
    traceId: shop.id,
    persistRecord,
  });
}
