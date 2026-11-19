import { NotFoundError } from "./errors";
import type { AccountType } from "./jwt";
import type { IdentityStore } from "./store";
import { StripeNotConfiguredError, type StripeClient } from "./stripe";
import { quotaStateFor } from "./quota";
import { shopBucketView, shopTrialView, type ShopTrialView } from "./credits";
import { SHOP_FREE_DIAGNOSES } from "./pricing";

/**
 * Billing service (owner spec, Nov 3 2026) — the manage/cancel-anytime
 * surface behind the dashboard's billing section.
 *
 * The stance matches the product's trust standard: the plan, its
 * status, and the period end are stated in plain words from the
 * account record (kept current by the webhook — migration 0010), and
 * managing or cancelling happens in Stripe's Billing Portal: change
 * plan, update card, cancel — effective at period end, no fees, no
 * phone calls, no retention maze. This service never invents a portal
 * URL: no Stripe key → StripeNotConfiguredError (the route answers
 * 501); no Stripe customer on the record → NoBillingAccountError
 * (409) — a free account has nothing to manage yet, and saying so is
 * the honest answer.
 */

export class NoBillingAccountError extends Error {
  readonly code = "no_billing_account";
  constructor() {
    super("This account has no billing account yet — there is no subscription to manage.");
    this.name = "NoBillingAccountError";
  }
}

/** What the billing section renders — all of it from the record. */
export interface BillingView {
  plan: string;
  subscriptionStatus: string | null;
  /** ISO timestamp; the renewal date while the subscription is active. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** True once any checkout has put a Stripe customer on the record. */
  hasBillingAccount: boolean;
}

interface BillingRecord {
  plan: string;
  stripeCustomerId: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

async function loadBillingRecord(
  store: IdentityStore,
  accountId: string,
  accountType: AccountType,
): Promise<BillingRecord | null> {
  if (accountType === "driver") {
    const user = await store.findUserById(accountId);
    return user
      ? {
          plan: user.plan,
          stripeCustomerId: user.stripeCustomerId,
          subscriptionStatus: user.subscriptionStatus,
          currentPeriodEnd: user.currentPeriodEnd,
          cancelAtPeriodEnd: user.cancelAtPeriodEnd,
        }
      : null;
  }
  if (accountType === "shop") {
    const shop = await store.findShopById(accountId);
    return shop
      ? {
          plan: shop.plan,
          stripeCustomerId: shop.stripeCustomerId,
          subscriptionStatus: shop.subscriptionStatus,
          currentPeriodEnd: shop.currentPeriodEnd,
          cancelAtPeriodEnd: shop.cancelAtPeriodEnd,
        }
      : null;
  }
  const towing = await store.findTowingById(accountId);
  return towing
    ? {
        plan: towing.plan,
        stripeCustomerId: towing.stripeCustomerId,
        subscriptionStatus: towing.subscriptionStatus,
        currentPeriodEnd: towing.currentPeriodEnd,
        cancelAtPeriodEnd: towing.cancelAtPeriodEnd,
      }
    : null;
}

export async function getBillingView(
  store: IdentityStore,
  account: { id: string; type: AccountType },
): Promise<BillingView> {
  const record = await loadBillingRecord(store, account.id, account.type);
  if (!record) throw new NotFoundError("Account not found.");
  return {
    plan: record.plan,
    subscriptionStatus: record.subscriptionStatus ?? null,
    currentPeriodEnd: record.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd ?? false,
    hasBillingAccount: record.stripeCustomerId !== null,
  };
}

/**
 * The credit-model state the billing section and the paywall render
 * (Stripe pass, 2026-11-18) — kept OUT of BillingView, whose shape is
 * pinned by the billing tests; the status route attaches this beside
 * it. Drivers: free remaining, the Pro bucket, purchased singles.
 * Shops: their free allowance and the business bucket. Towing: null
 * (the listing plan carries no diagnoses).
 */
export interface CreditsView {
  freeUsed: number;
  freeLimit: number;
  freeRemaining: number;
  /** Purchased single credits (drivers); null where the concept doesn't apply. */
  purchasedCredits: number | null;
  bucket: { limit: number; used: number; remaining: number } | null;
  /** The free-trial state (shops, 2026-11-19); null for drivers. For
   * a shop past its trial window the free counts above read 0
   * remaining — lapsed trial credits are not spendable. */
  trial?: ShopTrialView | null;
}

export async function getCreditsView(
  store: IdentityStore,
  account: { id: string; type: AccountType },
): Promise<CreditsView | null> {
  if (account.type === "driver") {
    const user = await store.findUserById(account.id);
    if (!user) throw new NotFoundError("Account not found.");
    const quota = quotaStateFor({
      plan: user.plan,
      freeDiagnosesUsed: user.freeDiagnosesUsed,
      purchasedCredits: user.diagnosisCredits,
      monthlyDiagnosesUsed: user.monthlyDiagnosesUsed,
      monthlyPeriodStart: user.monthlyPeriodStart,
    });
    return {
      freeUsed: quota.used,
      freeLimit: quota.limit,
      freeRemaining: quota.remaining,
      purchasedCredits: quota.credits,
      bucket: quota.bucket
        ? { limit: quota.bucket.limit, used: quota.bucket.used, remaining: quota.bucket.remaining }
        : null,
    };
  }
  if (account.type === "shop") {
    const shop = await store.findShopById(account.id);
    if (!shop) throw new NotFoundError("Account not found.");
    const trial = shopTrialView(shop);
    const bucket = shopBucketView(shop);
    // The free shelf is the trial pool: it reads as remaining only
    // while the trial is active (or the shop is subscribed, where
    // the settled free-first order still applies). A lapsed trial
    // shows 0 — the credits are gone, and the card says so via the
    // trial state below.
    const freeOpen = shop.plan === "business" ? trial.creditsRemaining > 0 : trial.active;
    return {
      freeUsed: trial.creditsUsed,
      freeLimit: SHOP_FREE_DIAGNOSES,
      freeRemaining: freeOpen ? trial.creditsRemaining : 0,
      purchasedCredits: null,
      bucket: bucket
        ? { limit: bucket.limit, used: bucket.used, remaining: bucket.remaining }
        : null,
      trial,
    };
  }
  return null;
}

/**
 * Open the Stripe Billing Portal for the signed-in account. The portal
 * session is created for THE account's own Stripe customer — the id
 * comes from the persisted record, never from the request.
 */
export async function openBillingPortal(
  store: IdentityStore,
  stripe: StripeClient | null,
  account: { id: string; type: AccountType },
): Promise<{ url: string }> {
  if (!stripe) throw new StripeNotConfiguredError();
  const record = await loadBillingRecord(store, account.id, account.type);
  if (!record) throw new NotFoundError("Account not found.");
  if (!record.stripeCustomerId) throw new NoBillingAccountError();
  const clientUrl = process.env.CLIENT_URL ?? "";
  const session = await stripe.createBillingPortalSession({
    customerId: record.stripeCustomerId,
    returnUrl: `${clientUrl}/app`,
  });
  return { url: session.url };
}
