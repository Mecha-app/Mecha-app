import type { IdentityStore, ShopRecord } from "./store";
import {
  SHOP_FREE20_LIMIT,
  SHOP_FREE_DIAGNOSES,
  SHOP_MONTHLY_CREDITS,
  SHOP_TRIAL_CREDITS,
  SHOP_TRIAL_DAYS,
} from "./pricing";

/**
 * credits.ts — the monthly-bucket math and the shop-side consumption
 * service (Stripe pass, 2026-11-18).
 *
 * A "bucket" is a per-cycle allowance denominated in diagnoses: Pro
 * drivers get 100/month, shops on the business plan get 500/month. The
 * bucket NEVER rolls over: when a full month has passed since the
 * bucket's anchor, the counter resets. The reset is LAZY — it is
 * computed at consume time from the stored anchor — so it works even
 * if a Stripe renewal webhook is ever missed, and Stripe events reset
 * it eagerly on activation/renewal as well (store.resetMonthlyBucket).
 *
 * The anchor advances to the consume moment when a reset fires (not
 * forward by whole months): a bucket that sat idle for three months
 * refills ONCE, at the moment of the next diagnosis — never three
 * times. That is the strict reading of "no rollover".
 */

export interface MonthlyBucketState {
  /** Diagnoses available in the bucket right now. */
  remaining: number;
  /** Diagnoses the current window has actually used (post-reset view). */
  used: number;
  /** The bucket's size for this cycle. */
  limit: number;
  /** True when the stored window is a full month old (a consume would reset it). */
  stale: boolean;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/**
 * The read-only view of a bucket. `periodStart === null` means the
 * bucket has never been anchored (fresh subscription): the full limit
 * is available and the first consume anchors the window.
 */
export function monthlyBucketView(input: {
  used: number;
  periodStart: string | null;
  limit: number;
  now?: Date;
}): MonthlyBucketState {
  const now = input.now ?? new Date();
  if (input.periodStart) {
    const start = new Date(input.periodStart);
    if (!Number.isNaN(start.getTime()) && now >= addMonths(start, 1)) {
      return { remaining: input.limit, used: 0, limit: input.limit, stale: true };
    }
  }
  const used = Math.max(0, Math.min(input.used, input.limit));
  return { remaining: input.limit - used, used, limit: input.limit, stale: false };
}

/** Which shelf a consumed diagnosis came from, in consumption order. */
export type CreditSource = "free" | "monthly" | "purchased";

// ---------------------------------------------------------------------------
// The Shops free trial (owner decision, 2026-11-19 — final spec)
// ---------------------------------------------------------------------------
//
// A shop's trial is a WINDOW plus a CREDIT POOL, both on the shop
// record (migration 0020): trial_started_at / trial_ends_at bound
// the 14 days, and free_diagnoses_used counts against the 25 trial
// credits (pricing.SHOP_TRIAL_CREDITS). The trial ends at whichever
// comes first. Expiry is computed from the stored ends_at — never
// from session state — so a shop that never signs in still runs out
// of trial on day 14.
//
// A shop ON the business plan is not "in trial" for consumption:
// the settled order (free first, then the bucket) keeps applying,
// so converting mid-trial never double-grants — the bucket starts
// on payment (webhook reset) and the remaining trial credits are
// simply drawn first, exactly as the pre-trial model drew the free
// allowance first.

export interface ShopTrialView {
  /** True while the shop may still spend trial credits. */
  active: boolean;
  /** ISO timestamps of the stored window; null when none is recorded. */
  startedAt: string | null;
  endsAt: string | null;
  /** Whole days left in the window (0 once the window has passed). */
  daysLeft: number;
  /** Trial credits: limit, used, remaining. */
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  /** Why the trial is over, when it is: the clock or the credits. */
  endedReason: "time" | "credits" | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function shopTrialView(shop: ShopRecord, now: Date = new Date()): ShopTrialView {
  const creditsUsed = Math.max(0, Math.min(shop.freeDiagnosesUsed ?? 0, SHOP_TRIAL_CREDITS));
  const creditsRemaining = SHOP_TRIAL_CREDITS - creditsUsed;
  const endsAt = shop.trialEndsAt ?? null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const hasWindow = Number.isFinite(endsMs);
  const timeLeft = hasWindow ? endsMs - now.getTime() : 0;
  const timeExpired = !hasWindow || timeLeft <= 0;
  const daysLeft = timeExpired ? 0 : Math.ceil(timeLeft / DAY_MS);
  const endedReason: ShopTrialView["endedReason"] =
    shop.plan === "business"
      ? null
      : creditsRemaining <= 0
        ? "credits"
        : timeExpired
          ? "time"
          : null;
  return {
    active: shop.plan !== "business" && endedReason === null,
    startedAt: shop.trialStartedAt ?? null,
    endsAt,
    daysLeft,
    creditsLimit: SHOP_TRIAL_CREDITS,
    creditsUsed,
    creditsRemaining,
    endedReason,
  };
}

/** The trial window for a shop signing up at `start`. */
export function shopTrialWindow(start: Date): { startedAt: string; endsAt: string } {
  const ends = new Date(start.getTime() + SHOP_TRIAL_DAYS * DAY_MS);
  return { startedAt: start.toISOString(), endsAt: ends.toISOString() };
}

/** Which free terms govern a shop (owner decision 2026-11-20).
 * "free20" is the current standard — migration 0023 stamps every
 * NEW business row 'free20' (20 diagnoses, no day limit). Anything
 * else ('legacy', null, a record built before the column existed)
 * keeps the 14-day / 25-diagnosis trial the Wave 1 shops were
 * promised when they registered. */
export type ShopFreeTerms = "legacy" | "free20";

export function shopFreeTermsOf(shop: ShopRecord): ShopFreeTerms {
  return shop.freeTerms === "free20" ? "free20" : "legacy";
}

export interface ShopFreeView {
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
}

/** The count-only free shelf of a free20 shop: 20 diagnoses, no day
 * limit. Same numbers the dashboard shows the shop — the limit is
 * visible in its account, never an ambush at diagnosis 21. */
export function shopFreeView(shop: ShopRecord): ShopFreeView {
  const used = shop.freeDiagnosesUsed ?? 0;
  const remaining = Math.max(0, SHOP_FREE20_LIMIT - used);
  return { limit: SHOP_FREE20_LIMIT, used, remaining, exhausted: remaining <= 0 };
}

/**
 * The shop-side quota state — the shape the diagnosis stream, the
 * check-limit route, and /api/auth/me hand to the shop's screens.
 * `remaining`/`limit` describe the trial-credit shelf while it is
 * the shelf being drawn from, so the shared diagnose page renders
 * the same countdown card it renders for drivers.
 */
export interface ShopQuotaState {
  accountKind: "shop";
  /** "business" on the paid plan, "trial" while the trial runs,
   * "free" once the trial is over and nothing is left. */
  plan: "business" | "trial" | "free";
  used: number;
  limit: number;
  remaining: number;
  bucket: MonthlyBucketState | null;
  trial: ShopTrialView;
  canDiagnose: boolean;
  /** The shop's free terms + its count-only free shelf (free20
   * shops); `free` is null for legacy shops, whose shelf is the
   * trial view above. */
  terms: ShopFreeTerms;
  free: ShopFreeView | null;
}

export function shopQuotaStateFor(shop: ShopRecord, now: Date = new Date()): ShopQuotaState {
  const trial = shopTrialView(shop, now);
  const bucket = shopBucketView(shop, now);
  const onPlan = shop.plan === "business";
  const terms = shopFreeTermsOf(shop);
  if (terms === "free20") {
    // Count-only shelf: 20 diagnoses, no day limit. Same shape
    // conventions as the legacy branch below — used/limit/remaining
    // describe the free shelf being drawn from.
    const free = shopFreeView(shop);
    const freeOpen = free.remaining > 0;
    return {
      accountKind: "shop",
      plan: onPlan ? "business" : "free",
      used: free.used,
      limit: free.limit,
      remaining: freeOpen ? free.remaining : 0,
      bucket,
      trial,
      canDiagnose: freeOpen || (bucket !== null && bucket.remaining > 0),
      terms,
      free,
    };
  }
  const freeOpen = onPlan
    ? trial.creditsRemaining > 0
    : trial.active;
  return {
    accountKind: "shop",
    plan: onPlan ? "business" : trial.active ? "trial" : "free",
    used: trial.creditsUsed,
    limit: trial.creditsLimit,
    remaining: freeOpen ? trial.creditsRemaining : 0,
    bucket,
    trial,
    canDiagnose: freeOpen || (bucket !== null && bucket.remaining > 0),
    terms,
    free: null,
  };
}

/** The countdown line a shop hears after each diagnosis. */
export function shopCountdownMessage(state: ShopQuotaState): string {
  if (state.terms === "free20" && state.free) {
    if (state.free.remaining > 1) {
      return `You have ${state.free.remaining} free diagnoses left (of your ${state.free.limit} free).`;
    }
    if (state.free.remaining === 1) {
      return `You have 1 free diagnosis left (of your ${state.free.limit} free).`;
    }
    if (state.bucket && state.bucket.remaining > 0) {
      return `Your free diagnoses are used up. Shop plan credits: ${state.bucket.remaining} of ${state.bucket.limit} left this month.`;
    }
    return shopPaywallMessage(state);
  }
  if (state.remaining > 1) {
    return `You have ${state.remaining} free trial diagnoses left (${state.trial.daysLeft} ${state.trial.daysLeft === 1 ? "day" : "days"} left in your free trial).`;
  }
  if (state.remaining === 1) {
    return "You have 1 free trial diagnosis left.";
  }
  if (state.bucket && state.bucket.remaining > 0) {
    return `Your free trial diagnoses are used up. Shop plan credits: ${state.bucket.remaining} of ${state.bucket.limit} left this month.`;
  }
  return shopPaywallMessage(state);
}

/** The honest wall: the trial is over — subscribing is the way back in. */
export function shopPaywallMessage(state: ShopQuotaState): string {
  if (state.plan === "business") {
    return "Your Shop plan's 500 monthly diagnosis credits are used up for this cycle. They renew with your next billing cycle — nothing more is charged until you choose.";
  }
  if (state.terms === "free20") {
    return "You've used your 20 free diagnoses. Subscribe to MECHA for Shops ($149/mo, 500 diagnoses a month) to keep diagnosing cars in your shop. Nothing is charged until you choose.";
  }
  return "Your free trial has ended — 14 days free, 25 diagnoses on us, no card. Subscribe to MECHA for Shops ($149/mo, 500 diagnoses a month) to keep diagnosing cars in your shop. Nothing is charged until you choose.";
}

export type ShopConsumeResult =
  | {
      ok: true;
      source: CreditSource;
      freeUsed: number;
      bucket: MonthlyBucketState | null;
      trial: ShopTrialView;
      free: ShopFreeView | null;
    }
  | {
      ok: false;
      freeUsed: number;
      bucket: MonthlyBucketState | null;
      trial: ShopTrialView;
      free: ShopFreeView | null;
    };

/**
 * Consume one diagnosis for a SHOP, in the settled order: the free
 * shelf first, then — only while the business plan is active — the
 * monthly bucket. The free shelf is the TRIAL pool (2026-11-19): for
 * an unsubscribed shop it is open only while the trial is active —
 * inside the 14-day window AND under the 25-credit limit; when the
 * trial ends (whichever comes first) unused trial credits lapse. A
 * subscribed shop keeps the settled free-first order (its remaining
 * trial credits draw first, then the bucket), so converting
 * mid-trial never double-grants. Shops hold no purchased singles in
 * this model, so an exhausted shop waits for renewal or subscribes.
 * Mirrors the driver rule: consumption happens BEFORE the work runs
 * and is never refunded by a failure.
 */
export async function consumeShopDiagnosis(
  store: IdentityStore,
  shop: ShopRecord,
  now: Date = new Date(),
): Promise<ShopConsumeResult> {
  const freeUsed = shop.freeDiagnosesUsed ?? 0;
  const trialBefore = shopTrialView(shop, now);
  // The free shelf's terms decide both its limit and when it is
  // open: legacy = the trial pool (open while the trial is active,
  // or while credits remain for a subscribed shop); free20 = the
  // count alone (open while any of the 20 remain, subscribed or
  // not — a subscribed free20 shop still draws its free shelf
  // first, then the bucket).
  const terms = shopFreeTermsOf(shop);
  const freeBefore = terms === "free20" ? shopFreeView(shop) : null;
  const freeLimit = terms === "free20" ? SHOP_FREE20_LIMIT : SHOP_FREE_DIAGNOSES;
  const freeOpen =
    terms === "free20"
      ? (freeBefore?.remaining ?? 0) > 0
      : shop.plan === "business"
        ? trialBefore.creditsRemaining > 0
        : trialBefore.active;
  if (freeOpen && freeUsed < freeLimit) {
    const taken = await store.consumeShopFreeDiagnosis(shop.id, freeLimit);
    if (taken) {
      const after: ShopRecord = { ...shop, freeDiagnosesUsed: freeUsed + 1 };
      return {
        ok: true,
        source: "free",
        freeUsed: freeUsed + 1,
        bucket: shopBucketView(shop, now),
        trial: shopTrialView(after, now),
        free: terms === "free20" ? shopFreeView(after) : null,
      };
    }
  }
  if (shop.plan === "business") {
    const before = shopBucketView(shop, now);
    const taken = await store.consumeMonthlyDiagnosis("shop", shop.id, SHOP_MONTHLY_CREDITS, now);
    if (taken && before) {
      // The store's conditional UPDATE mirrors monthlyBucketView: a
      // stale or unanchored window restarts at 1 used, a live window
      // increments. Derive the after-view from the before-view so the
      // reported numbers are exact without a second read.
      const used = before.stale || !shop.monthlyPeriodStart ? 1 : before.used + 1;
      return {
        ok: true,
        source: "monthly",
        freeUsed,
        bucket: { remaining: before.limit - used, used, limit: before.limit, stale: false },
        trial: trialBefore,
        free: freeBefore,
      };
    }
  }
  return {
    ok: false,
    freeUsed,
    bucket: shop.plan === "business" ? shopBucketView(shop, now) : null,
    trial: trialBefore,
    free: freeBefore,
  };
}

/** The shop's current bucket view (business plan only). */
export function shopBucketView(shop: ShopRecord, now: Date = new Date()): MonthlyBucketState | null {
  if (shop.plan !== "business") return null;
  return monthlyBucketView({
    used: shop.monthlyDiagnosesUsed ?? 0,
    periodStart: shop.monthlyPeriodStart ?? null,
    limit: SHOP_MONTHLY_CREDITS,
    now,
  });
}
