/**
 * Billing tests — wallet-ready checkout + manage/cancel-anytime
 * (owner spec, Nov 3 2026).
 *
 * Run: npm test (same harness as WP5/WP6 — in-memory store + stub
 * Stripe client; ZERO real Stripe calls).
 *
 * Covered:
 *   - checkout session wire params carry NO card-only restriction, so
 *     Stripe Checkout can surface Apple Pay / Google Pay alongside
 *     card (the form builder is exactly what the HTTP client sends)
 *   - billing portal: the session is created for the signed-in
 *     account's OWN Stripe customer (driver and shop), unwired Stripe
 *     → stripe_not_configured, no customer on file →
 *     no_billing_account, unknown account → not found
 *   - webhook reflection: customer.subscription.* events persist
 *     status / period end / cancel flag on a SHOP account (resolved by
 *     customer id — those events carry no checkout metadata), and a
 *     deleted subscription returns the account to its free plan
 *   - the billing view the dashboard renders reads the same record
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "billing-test-secret-not-a-real-one";
process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
process.env.STRIPE_BUSINESS_PRICE_ID = "price_business_test";
process.env.CLIENT_URL = "https://mechatech.test";

import { registerDriver } from "../lib/server/authService";
import {
  NoBillingAccountError,
  getBillingView,
  openBillingPortal,
} from "../lib/server/billingService";
import { NotFoundError } from "../lib/server/errors";
import { MemoryIdentityStore } from "../lib/server/store";
import {
  StripeNotConfiguredError,
  StubStripeClient,
  buildCheckoutSessionForm,
  handleStripeEvent,
} from "../lib/server/stripe";

const DRIVER = {
  name: "Billing Driver",
  email: "billing@example.com",
  phone: "(617) 555-0142",
  password: "correct horse battery",
};

test("checkout session params carry no card-only restriction (wallet-ready)", () => {
  const form = buildCheckoutSessionForm({
    priceId: "price_pro_test",
    customerEmail: "driver@example.com",
    successUrl: "https://mechatech.test/dashboard?success=true",
    cancelUrl: "https://mechatech.test/#pricing",
    metadata: { accountId: "user-1", accountType: "driver", plan: "pro" },
  });
  // The wallet rule: payment_method_types is ABSENT — not narrowed to
  // card, not enumerated at all — so Checkout surfaces every method
  // enabled on the account (card + Apple Pay + Google Pay).
  const keys = [...form.keys()];
  assert.ok(
    !keys.some((k) => k.startsWith("payment_method_types")),
    `payment_method_types must not be sent; got keys: ${keys.join(", ")}`,
  );
  assert.equal(form.get("mode"), "subscription");
  assert.equal(form.get("line_items[0][price]"), "price_pro_test");
  assert.equal(form.get("customer_email"), "driver@example.com");
  assert.equal(form.get("metadata[accountType]"), "driver");
});

test("portal: session is created for the driver's OWN Stripe customer", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("billing@example.com");
  assert.ok(user);
  await store.applyPlanUpdate({
    accountType: "driver",
    accountId: user.id,
    plan: "pro",
    stripeCustomerId: "cus_driver_9",
  });

  const result = await openBillingPortal(store, stripe, { id: user.id, type: "driver" });
  assert.equal(result.url, "https://billing.stripe.test/portal");
  assert.equal(stripe.portalSessions.length, 1);
  assert.equal(stripe.portalSessions[0].customerId, "cus_driver_9");
  assert.equal(stripe.portalSessions[0].returnUrl, "https://mechatech.test/app");
});

test("portal: shop customer mapping — the shop's customer, not anyone else's", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  store.shops.set("shop-7", {
    id: "shop-7",
    shopName: "Fair Fix Auto",
    email: "owner@fairfix.example",
    plan: "business",
    stripeCustomerId: "cus_shop_7",
  });
  const result = await openBillingPortal(store, stripe, { id: "shop-7", type: "shop" });
  assert.equal(result.url, "https://billing.stripe.test/portal");
  assert.equal(stripe.portalSessions[0].customerId, "cus_shop_7");
});

test("portal: no Stripe customer on file → no_billing_account (409)", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("billing@example.com");
  assert.ok(user);
  await assert.rejects(
    openBillingPortal(store, stripe, { id: user.id, type: "driver" }),
    (err: unknown) => err instanceof NoBillingAccountError && err.code === "no_billing_account",
  );
  assert.equal(stripe.portalSessions.length, 0, "no portal session was created");
});

test("portal: unwired Stripe → stripe_not_configured (501), no URL invented", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("billing@example.com");
  assert.ok(user);
  await store.applyPlanUpdate({
    accountType: "driver",
    accountId: user.id,
    plan: "pro",
    stripeCustomerId: "cus_driver_9",
  });
  await assert.rejects(
    openBillingPortal(store, null, { id: user.id, type: "driver" }),
    (err: unknown) => err instanceof StripeNotConfiguredError && err.code === "stripe_not_configured",
  );
});

test("portal + view: unknown account → not found", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  await assert.rejects(
    openBillingPortal(store, stripe, { id: "user-ghost", type: "driver" }),
    (err: unknown) => err instanceof NotFoundError,
  );
  await assert.rejects(
    getBillingView(store, { id: "user-ghost", type: "driver" }),
    (err: unknown) => err instanceof NotFoundError,
  );
});

test("webhook: subscription lifecycle reflects status + period end on a SHOP", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  store.shops.set("shop-1", {
    id: "shop-1",
    shopName: "Fair Fix Auto",
    email: "owner@fairfix.example",
    plan: "free",
    stripeCustomerId: null,
  });

  // Checkout completes: plan + customer + the subscription it created.
  stripe.event = {
    type: "checkout.session.completed",
    session: {
      id: "cs_1",
      customer: "cus_shop_1",
      subscription: "sub_shop_1",
      metadata: { accountId: "shop-1", accountType: "shop", plan: "business" },
    },
  };
  assert.equal(await handleStripeEvent(store, stripe.constructEvent("{}", "sig")), true);
  let shop = await store.findShopById("shop-1");
  assert.equal(shop?.plan, "business");
  assert.equal(shop?.stripeCustomerId, "cus_shop_1");
  assert.equal(shop?.stripeSubscriptionId, "sub_shop_1");

  // Subscription updated — NO account metadata on these events; the
  // account is resolved by the Stripe customer id alone. The owner
  // has cancelled in the portal: cancel_at_period_end = true, access
  // until the period end the UI must state.
  stripe.event = {
    type: "customer.subscription.updated",
    session: { id: "", customer: null, metadata: {} },
    subscription: {
      id: "sub_shop_1",
      customer: "cus_shop_1",
      status: "active",
      currentPeriodEnd: "2026-12-03T15:00:00.000Z",
      cancelAtPeriodEnd: true,
      priceId: "price_business_test",
      metadata: {},
    },
  };
  assert.equal(await handleStripeEvent(store, stripe.constructEvent("{}", "sig")), true);
  shop = await store.findShopById("shop-1");
  assert.equal(shop?.subscriptionStatus, "active");
  assert.equal(shop?.currentPeriodEnd, "2026-12-03T15:00:00.000Z");
  assert.equal(shop?.cancelAtPeriodEnd, true);
  assert.equal(shop?.plan, "business", "plan still derived from the subscription's price");

  // The dashboard's billing view reads exactly this record.
  const view = await getBillingView(store, { id: "shop-1", type: "shop" });
  assert.deepEqual(view, {
    plan: "business",
    subscriptionStatus: "active",
    currentPeriodEnd: "2026-12-03T15:00:00.000Z",
    cancelAtPeriodEnd: true,
    hasBillingAccount: true,
  });

  // Subscription deleted (period reached after the cancel): status
  // canceled, plan returns to free, cancel flag clears.
  stripe.event = {
    type: "customer.subscription.deleted",
    session: { id: "", customer: null, metadata: {} },
    subscription: {
      id: "sub_shop_1",
      customer: "cus_shop_1",
      status: "canceled",
      currentPeriodEnd: "2026-12-03T15:00:00.000Z",
      cancelAtPeriodEnd: false,
      priceId: "price_business_test",
      metadata: {},
    },
  };
  assert.equal(await handleStripeEvent(store, stripe.constructEvent("{}", "sig")), true);
  shop = await store.findShopById("shop-1");
  assert.equal(shop?.subscriptionStatus, "canceled");
  assert.equal(shop?.plan, "free");
  assert.equal(shop?.cancelAtPeriodEnd, false);
});

test("billing view: a free driver has no billing account and no status", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("billing@example.com");
  assert.ok(user);
  const view = await getBillingView(store, { id: user.id, type: "driver" });
  assert.deepEqual(view, {
    plan: "free",
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasBillingAccount: false,
  });
});
