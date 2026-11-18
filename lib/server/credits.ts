import type { IdentityStore, ShopRecord } from "./store";
import { SHOP_FREE_DIAGNOSES, SHOP_MONTHLY_CREDITS } from "./pricing";

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

export type ShopConsumeResult =
  | { ok: true; source: CreditSource; freeUsed: number; bucket: MonthlyBucketState | null }
  | { ok: false; freeUsed: number; bucket: MonthlyBucketState | null };

/**
 * Consume one diagnosis for a SHOP, in the settled order: the shop's
 * free allowance first (SHOP_FREE_DIAGNOSES at signup), then — only
 * while the business plan is active — the monthly bucket. Shops hold
 * no purchased singles in this model, so an exhausted shop waits for
 * renewal or resubscribes. Mirrors the driver rule: consumption
 * happens BEFORE the work runs and is never refunded by a failure.
 */
export async function consumeShopDiagnosis(
  store: IdentityStore,
  shop: ShopRecord,
  now: Date = new Date(),
): Promise<ShopConsumeResult> {
  const freeUsed = shop.freeDiagnosesUsed ?? 0;
  if (freeUsed < SHOP_FREE_DIAGNOSES) {
    const taken = await store.consumeShopFreeDiagnosis(shop.id);
    if (taken) {
      return {
        ok: true,
        source: "free",
        freeUsed: freeUsed + 1,
        bucket: shopBucketView(shop, now),
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
      };
    }
  }
  return { ok: false, freeUsed, bucket: shop.plan === "business" ? shopBucketView(shop, now) : null };
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
