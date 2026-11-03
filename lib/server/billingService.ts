import { NotFoundError } from "./errors";
import type { AccountType } from "./jwt";
import type { IdentityStore } from "./store";
import { StripeNotConfiguredError, type StripeClient } from "./stripe";

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
