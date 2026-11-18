"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoBillingAccountError = void 0;
exports.getBillingView = getBillingView;
exports.openBillingPortal = openBillingPortal;
const errors_1 = require("./errors");
const stripe_1 = require("./stripe");
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
class NoBillingAccountError extends Error {
    code = "no_billing_account";
    constructor() {
        super("This account has no billing account yet — there is no subscription to manage.");
        this.name = "NoBillingAccountError";
    }
}
exports.NoBillingAccountError = NoBillingAccountError;
async function loadBillingRecord(store, accountId, accountType) {
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
async function getBillingView(store, account) {
    const record = await loadBillingRecord(store, account.id, account.type);
    if (!record)
        throw new errors_1.NotFoundError("Account not found.");
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
async function openBillingPortal(store, stripe, account) {
    if (!stripe)
        throw new stripe_1.StripeNotConfiguredError();
    const record = await loadBillingRecord(store, account.id, account.type);
    if (!record)
        throw new errors_1.NotFoundError("Account not found.");
    if (!record.stripeCustomerId)
        throw new NoBillingAccountError();
    const clientUrl = process.env.CLIENT_URL ?? "";
    const session = await stripe.createBillingPortalSession({
        customerId: record.stripeCustomerId,
        returnUrl: `${clientUrl}/app`,
    });
    return { url: session.url };
}
