/**
 * Diagnosis quota + credits (WP5, extended by the Stripe pass,
 * 2026-11-18) — the owner's rules, as code:
 *
 *   1. FIVE free diagnoses per account identity, LIFETIME. (This
 *      supersedes the legacy monthly counter — see db/migrations/0008.)
 *   2. The counts live ONLY on the server-side records, keyed to the
 *      identity (email + normalized phone). They are never stored in
 *      the browser and never reset by signing out or signing up again.
 *   3. Consumption happens BEFORE the AI provider is called (each
 *      consume is one atomic conditional UPDATE in the store), so a
 *      blocked user can never trigger a paid AI call — and a failed
 *      AI run does NOT refund the consumption, the rule the free
 *      counter has always followed.
 *   4. Every response states where the driver stands — free diagnoses
 *      remaining, bucket credits, purchased credits — and at zero the
 *      message is plain and respectful.
 *
 * THE CREDIT MODEL (Frantz, 2026-11-17/18 — supersedes the old
 * "Pro = unlimited" bypass): when the free 5 are gone a driver pays
 * per diagnosis — either Pro ($9.99/month = a bucket of 100 diagnosis
 * credits that resets each cycle, NO rollover) or single purchased
 * credits ($4 default, never expiring). Consumption order: free
 * lifetime first, then the monthly bucket (it expires), then
 * purchased singles. 1 diagnosis = 1 credit; nothing is "unlimited".
 */

import { monthlyBucketView, type MonthlyBucketState } from "./credits";
import {
  PRO_MONTHLY_CREDITS,
  diagnosisPriceCents,
  formatUsdShort,
} from "./pricing";

export const FREE_DIAGNOSIS_LIMIT = 5;

export type PlanTier = "free" | "pro";

export interface QuotaState {
  plan: PlanTier;
  /** diagnoses consumed against the lifetime free allowance */
  used: number;
  /** the lifetime free allowance (every account has one) */
  limit: number;
  /** free diagnoses remaining */
  remaining: number;
  /** purchased single credits on hand (never expire) */
  credits: number;
  /** the Pro monthly bucket view, when the plan carries one; else null */
  bucket: MonthlyBucketState | null;
  canDiagnose: boolean;
  lifetime: true;
}

export function quotaStateFor(input: {
  plan: PlanTier;
  freeDiagnosesUsed: number;
  purchasedCredits?: number;
  monthlyDiagnosesUsed?: number;
  monthlyPeriodStart?: string | null;
  now?: Date;
}): QuotaState {
  const used = Math.max(0, input.freeDiagnosesUsed);
  const remaining = Math.max(0, FREE_DIAGNOSIS_LIMIT - used);
  const credits = Math.max(0, input.purchasedCredits ?? 0);
  const bucket =
    input.plan === "pro"
      ? monthlyBucketView({
          used: input.monthlyDiagnosesUsed ?? 0,
          periodStart: input.monthlyPeriodStart ?? null,
          limit: PRO_MONTHLY_CREDITS,
          now: input.now,
        })
      : null;
  return {
    plan: input.plan,
    used,
    limit: FREE_DIAGNOSIS_LIMIT,
    remaining,
    credits,
    bucket,
    canDiagnose: remaining > 0 || credits > 0 || (bucket !== null && bucket.remaining > 0),
    lifetime: true,
  };
}

/** The paywall line shown when every shelf is empty. */
export function paywallMessage(): string {
  return (
    `You've used all ${FREE_DIAGNOSIS_LIMIT} of your free diagnoses. ` +
    `Buy one diagnosis for ${formatUsdShort(diagnosisPriceCents())}, or subscribe to MECHA Pro ` +
    `for 100 diagnoses a month — nothing is charged until you choose.`
  );
}

/**
 * The countdown copy. Stated in EVERY diagnosis response (API + UI) —
 * after each diagnosis the driver hears exactly where they stand:
 * the free countdown while free diagnoses remain, then the shelf
 * being drawn from, and at zero the plain paywall.
 */
export function countdownMessage(quota: QuotaState): string {
  if (quota.remaining > 1) return `You have ${quota.remaining} free diagnoses left.`;
  if (quota.remaining === 1) return "You have 1 free diagnosis left.";
  if (quota.bucket && quota.bucket.remaining > 0) {
    return `Your free diagnoses are used up. Pro monthly credits: ${quota.bucket.remaining} of ${quota.bucket.limit} left this month.`;
  }
  if (quota.credits > 0) {
    return `Your free diagnoses are used up. Purchased diagnosis credits: ${quota.credits} left.`;
  }
  return paywallMessage();
}

export class QuotaExhaustedError extends Error {
  readonly code = "quota_exhausted";
  readonly quota: QuotaState;
  constructor(quota: QuotaState) {
    super(paywallMessage());
    this.name = "QuotaExhaustedError";
    this.quota = quota;
  }
}
