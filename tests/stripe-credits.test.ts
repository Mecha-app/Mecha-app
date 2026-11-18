/**
 * Stripe credit-model tests (2026-11-18) — the settled pricing model:
 *
 *   Free    5 diagnoses, lifetime (drivers) / 10 (shops)
 *   Pro     $9.99/month = 100 diagnosis credits per month (bucket,
 *           resets each cycle, no rollover)
 *   Single  one purchased diagnosis credit ($4.00 default — the ONE
 *           configurable price, lib/server/pricing.ts), never expires
 *   Shops   $149/month = 500 credits/month + the 10 free at signup
 *
 * Consumption order: free lifetime → monthly bucket → purchased
 * singles. Credits land ONLY through a signature-verified webhook,
 * exactly once per checkout session. Everything runs against the
 * in-memory store + stub Stripe client: zero calls to Stripe's API.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "stripe-credits-test-secret";
process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
process.env.STRIPE_BUSINESS_PRICE_ID = "price_business_test";
process.env.CLIENT_URL = "https://mechatech.test";
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
delete process.env.MECHA_DIAGNOSIS_PRICE_CENTS;

import { registerDriver } from "../lib/server/authService";
import { getCreditsView } from "../lib/server/billingService";
import { consumeShopDiagnosis } from "../lib/server/credits";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import type { DiagnosisProvider, ProviderEvent } from "../lib/server/provider";
import { StubDiagnosisProvider } from "../lib/server/provider";
import type { DiagnosisRequest } from "../lib/server/ai";
import {
  DIAGNOSIS_PRICE_CENTS_DEFAULT,
  diagnosisPriceCents,
} from "../lib/server/pricing";
import { QuotaExhaustedError, quotaStateFor } from "../lib/server/quota";
import { MemoryIdentityStore } from "../lib/server/store";
import {
  HttpStripeClient,
  StubStripeClient,
  StripeNotConfiguredError,
  buildInlineCheckoutSessionForm,
  createDiagnosisCreditCheckout,
  createProSubscriptionCheckout,
  createShopSubscriptionCheckout,
  getStripeClient,
  handleStripeEvent,
  type StripeCheckoutEvent,
} from "../lib/server/stripe";

const DRIVER = {
  name: "Credit Driver",
  email: "credits@example.com",
  phone: "(617) 555-0149",
  password: "correct horse battery",
};

async function collect(
  gen: AsyncGenerator<DiagnoseServiceEvent>,
): Promise<DiagnoseServiceEvent[]> {
  const events: DiagnoseServiceEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

function doneEvent(events: DiagnoseServiceEvent[]) {
  const done = events.filter((e) => e.type === "done");
  assert.equal(done.length, 1, "exactly one done event");
  return done[0] as Extract<DiagnoseServiceEvent, { type: "done" }>;
}

class ThrowingProvider implements DiagnosisProvider {
  readonly name = "throwing";
  readonly calls: DiagnosisRequest[] = [];
  async *stream(req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    this.calls.push(req);
    throw new Error("provider_down");
  }
}

async function freshDriver(store: MemoryIdentityStore) {
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("credits@example.com");
  assert.ok(user);
  return user;
}

/** Burn the driver's 5 free diagnoses with distinct problems. */
async function burnFreeDiagnoses(store: MemoryIdentityStore, userId: string) {
  const provider = new StubDiagnosisProvider();
  for (let i = 0; i < 5; i++) {
    const fresh = await store.findUserById(userId);
    assert.ok(fresh);
    await collect(
      executeDiagnosis(
        { store, provider },
        { user: fresh, request: { problem: `burn free ${i}` } },
      ),
    );
  }
  return provider;
}

function creditEvent(sessionId: string, userId: string): StripeCheckoutEvent {
  return {
    type: "checkout.session.completed",
    session: {
      id: sessionId,
      customer: "cus_credit_1",
      metadata: {
        kind: "diagnosis_credit",
        accountId: userId,
        accountType: "driver",
        userId,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// The price + the env gate
// ---------------------------------------------------------------------------

test("the single-diagnosis price: $4.00 default, one env override", () => {
  assert.equal(DIAGNOSIS_PRICE_CENTS_DEFAULT, 400);
  assert.equal(diagnosisPriceCents(), 400);
  process.env.MECHA_DIAGNOSIS_PRICE_CENTS = "550";
  try {
    assert.equal(diagnosisPriceCents(), 550);
  } finally {
    delete process.env.MECHA_DIAGNOSIS_PRICE_CENTS;
  }
  assert.equal(diagnosisPriceCents(), 400);
});

test("env gate: no Stripe key → no client (the honest not-wired state)", () => {
  assert.equal(getStripeClient(), null);
});

// ---------------------------------------------------------------------------
// Inline checkout sessions
// ---------------------------------------------------------------------------

test("credit checkout: one-time inline price, metadata ties the session to the user", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  const user = await freshDriver(store);
  const result = await createDiagnosisCreditCheckout({
    stripe,
    accountId: user.id,
    accountEmail: user.email,
  });
  assert.ok(result.url);
  assert.equal(stripe.inlineSessions.length, 1);
  const input = stripe.inlineSessions[0];
  assert.equal(input.mode, "payment");
  assert.equal(input.amountCents, 400);
  assert.equal(input.metadata.kind, "diagnosis_credit");
  assert.equal(input.metadata.accountId, user.id);

  const form = buildInlineCheckoutSessionForm(input);
  assert.equal(form.get("mode"), "payment");
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "400");
  assert.equal(form.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(form.get("customer_creation"), "always");
  // The wallet rule: never a payment_method_types restriction.
  assert.equal(form.get("payment_method_types[0]"), null);
  assert.ok(![...form.keys()].some((k) => k.startsWith("payment_method_types")));
});

test("pro checkout: $9.99/month recurring inline price, plan metadata on session AND subscription", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  const user = await freshDriver(store);
  await createProSubscriptionCheckout({ stripe, accountId: user.id, accountEmail: user.email });
  const input = stripe.inlineSessions[0];
  assert.equal(input.mode, "subscription");
  assert.equal(input.amountCents, 999);
  assert.equal(input.metadata.plan, "pro");
  const form = buildInlineCheckoutSessionForm(input);
  assert.equal(form.get("line_items[0][price_data][recurring][interval]"), "month");
  assert.equal(form.get("subscription_data[metadata][plan]"), "pro");
  assert.equal(form.get("subscription_data[metadata][accountId]"), user.id);
});

test("shop checkout: $149/month recurring inline price for the business plan", async () => {
  const stripe = new StubStripeClient();
  await createShopSubscriptionCheckout({
    stripe,
    accountId: "shop-1",
    accountType: "shop",
    accountEmail: "owner@fairfix.example",
  });
  const input = stripe.inlineSessions[0];
  assert.equal(input.mode, "subscription");
  assert.equal(input.amountCents, 14900);
  assert.equal(input.metadata.plan, "business");
  assert.equal(input.metadata.accountType, "shop");
});

// ---------------------------------------------------------------------------
// Webhook grants — verified only, exactly once
// ---------------------------------------------------------------------------

test("webhook grants one credit on checkout completion — and a replay grants nothing", async () => {
  const store = new MemoryIdentityStore();
  const user = await freshDriver(store);
  const event = creditEvent("cs_buy_1", user.id);

  assert.equal(await handleStripeEvent(store, event), true);
  let after = await store.findUserById(user.id);
  assert.equal(after?.diagnosisCredits, 1);
  assert.equal(after?.stripeCustomerId, "cus_credit_1", "the payer's customer id is recorded");

  // Stripe retries deliveries; the same session must never grant twice.
  assert.equal(await handleStripeEvent(store, event), true);
  after = await store.findUserById(user.id);
  assert.equal(after?.diagnosisCredits, 1, "replayed webhook must not double-grant");

  // A different session is a different purchase and grants again.
  assert.equal(await handleStripeEvent(store, creditEvent("cs_buy_2", user.id)), true);
  after = await store.findUserById(user.id);
  assert.equal(after?.diagnosisCredits, 2);
});

test("a bad webhook signature grants nothing and changes nothing", async () => {
  const store = new MemoryIdentityStore();
  const user = await freshDriver(store);
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  try {
    const client = new HttpStripeClient();
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_forged",
          customer: "cus_forged",
          metadata: { kind: "diagnosis_credit", accountId: user.id, userId: user.id },
        },
      },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const goodSig = createHmac("sha256", "whsec_test_secret")
      .update(`${timestamp}.${body}`)
      .digest("hex");
    // The genuine signature verifies and normalizes the event…
    const event = client.constructEvent(body, `t=${timestamp},v1=${goodSig}`);
    assert.equal(event.session.id, "cs_forged");
    // …a tampered body or a wrong secret does not.
    assert.throws(
      () => client.constructEvent(`${body} `, `t=${timestamp},v1=${goodSig}`),
      /stripe_signature_invalid/,
    );
    const wrongSig = createHmac("sha256", "whsec_other")
      .update(`${timestamp}.${body}`)
      .digest("hex");
    assert.throws(
      () => client.constructEvent(body, `t=${timestamp},v1=${wrongSig}`),
      /stripe_signature_invalid/,
    );
    // constructEvent threw before any event existed — nothing granted.
    assert.equal((await store.findUserById(user.id))?.diagnosisCredits, 0);
  } finally {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  }
  // And with no webhook secret at all, verification refuses outright.
  assert.throws(() => new HttpStripeClient().constructEvent("{}", "t=1,v1=abc"), StripeNotConfiguredError);
});

// ---------------------------------------------------------------------------
// Consumption order: free → monthly bucket → purchased singles
// ---------------------------------------------------------------------------

test("consumption order: free first, then the Pro bucket, then purchased singles", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const user = await freshDriver(store);

  // Two purchased singles on hand from the start — they must be the
  // LAST shelf touched, never the first.
  await handleStripeEvent(store, creditEvent("cs_a", user.id));
  await handleStripeEvent(store, creditEvent("cs_b", user.id));

  await burnFreeDiagnoses(store, user.id);
  let after = await store.findUserById(user.id);
  assert.equal(after?.freeDiagnosesUsed, 5);
  assert.equal(after?.diagnosisCredits, 2, "free diagnoses never touch purchased credits");

  // Subscribe (webhook: plan + bucket refill), then run the bucket
  // down to its last credit by hand so the order is observable.
  await handleStripeEvent(store, {
    type: "checkout.session.completed",
    session: {
      id: "cs_pro",
      customer: "cus_pro",
      subscription: "sub_pro",
      metadata: { kind: "subscription", accountId: user.id, accountType: "driver", plan: "pro" },
    },
  });
  const record = store.users.get(user.id);
  assert.ok(record);
  record.monthlyDiagnosesUsed = 99;

  const runOnce = async (problem: string) => {
    const fresh = await store.findUserById(user.id);
    assert.ok(fresh);
    return doneEvent(
      await collect(executeDiagnosis({ store, provider }, { user: fresh, request: { problem } })),
    );
  };

  const fromBucket = await runOnce("order check bucket");
  assert.equal(fromBucket.quota.bucket?.remaining, 0, "the bucket pays before singles");
  assert.equal(fromBucket.quota.credits, 2, "singles untouched while the bucket has credit");
  assert.equal((await store.findUserById(user.id))?.diagnosisCredits, 2);

  const fromSingle1 = await runOnce("order check single 1");
  assert.equal(fromSingle1.quota.credits, 1);
  const fromSingle2 = await runOnce("order check single 2");
  assert.equal(fromSingle2.quota.credits, 0);
  assert.equal(fromSingle2.quota.canDiagnose, false);

  const fresh = await store.findUserById(user.id);
  assert.ok(fresh);
  await assert.rejects(
    collect(
      executeDiagnosis({ store, provider }, { user: fresh, request: { problem: "one too many" } }),
    ),
    QuotaExhaustedError,
  );
});

test("a free-plan driver spends purchased singles after the free 5 — and never goes negative", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const user = await freshDriver(store);
  await handleStripeEvent(store, creditEvent("cs_solo", user.id));
  await burnFreeDiagnoses(store, user.id);

  const fresh = await store.findUserById(user.id);
  assert.ok(fresh);
  const done = doneEvent(
    await collect(
      executeDiagnosis({ store, provider }, { user: fresh, request: { problem: "paid run" } }),
    ),
  );
  assert.equal(done.quota.credits, 0);
  assert.equal(done.quota.remaining, 0);
  assert.equal((await store.findUserById(user.id))?.diagnosisCredits, 0);

  const again = await store.findUserById(user.id);
  assert.ok(again);
  await assert.rejects(
    collect(
      executeDiagnosis({ store, provider }, { user: again, request: { problem: "no credit left" } }),
    ),
    QuotaExhaustedError,
  );
  assert.equal((await store.findUserById(user.id))?.diagnosisCredits, 0, "never negative");
});

test("a failed AI run keeps the credit it consumed (the free counter's rule, mirrored)", async () => {
  const store = new MemoryIdentityStore();
  const user = await freshDriver(store);
  await handleStripeEvent(store, creditEvent("cs_fail", user.id));
  await burnFreeDiagnoses(store, user.id);
  assert.equal((await store.findUserById(user.id))?.diagnosisCredits, 1);

  const throwing = new ThrowingProvider();
  const fresh = await store.findUserById(user.id);
  assert.ok(fresh);
  await assert.rejects(
    collect(
      executeDiagnosis(
        { store, provider: throwing },
        { user: fresh, request: { problem: "this run fails" } },
      ),
    ),
  );
  assert.equal(throwing.calls.length, 1, "the provider WAS called — the run really started");
  assert.equal(
    (await store.findUserById(user.id))?.diagnosisCredits,
    0,
    "consumption is not refunded by a failed run",
  );
});

test("the monthly bucket refills when its window is a full month old (no rollover)", async () => {
  const store = new MemoryIdentityStore();
  const user = await freshDriver(store);
  await store.applyPlanUpdate({ accountType: "driver", accountId: user.id, plan: "pro" });
  const anchor = new Date("2026-10-01T00:00:00.000Z");
  await store.resetMonthlyBucket("user", user.id, anchor);
  const record = store.users.get(user.id);
  assert.ok(record);
  record.monthlyDiagnosesUsed = 100;

  // Inside the window: spent.
  assert.equal(
    await store.consumeMonthlyDiagnosis("user", user.id, 100, new Date("2026-10-20T00:00:00.000Z")),
    false,
  );
  // A full month later: the bucket restarts at this consume — once,
  // at 1 used, not refilled three times for three idle months.
  assert.equal(
    await store.consumeMonthlyDiagnosis("user", user.id, 100, new Date("2026-12-15T00:00:00.000Z")),
    true,
  );
  assert.equal(record.monthlyDiagnosesUsed, 1);
  assert.equal(record.monthlyPeriodStart, "2026-12-15T00:00:00.000Z");
});

test("quota state: canDiagnose reflects each shelf; the bucket is Pro-only", () => {
  const base = { freeDiagnosesUsed: 5 };
  assert.equal(quotaStateFor({ plan: "free", ...base }).canDiagnose, false);
  assert.equal(
    quotaStateFor({ plan: "free", ...base, purchasedCredits: 1 }).canDiagnose,
    true,
  );
  const pro = quotaStateFor({
    plan: "pro",
    ...base,
    monthlyDiagnosesUsed: 40,
    monthlyPeriodStart: new Date().toISOString(),
  });
  assert.equal(pro.bucket?.remaining, 60);
  assert.equal(pro.canDiagnose, true);
  const proSpent = quotaStateFor({
    plan: "pro",
    ...base,
    monthlyDiagnosesUsed: 100,
    monthlyPeriodStart: new Date().toISOString(),
  });
  assert.equal(proSpent.bucket?.remaining, 0);
  assert.equal(proSpent.canDiagnose, false, "a spent bucket with no singles cannot diagnose");
  assert.equal(
    quotaStateFor({
      plan: "pro",
      ...base,
      monthlyDiagnosesUsed: 100,
      monthlyPeriodStart: new Date().toISOString(),
      purchasedCredits: 1,
    }).canDiagnose,
    true,
    "…unless a purchased single tops it up",
  );
});

// ---------------------------------------------------------------------------
// Pro lifecycle: renewal refills, cancellation ends the bucket
// ---------------------------------------------------------------------------

test("pro renewal (period end advances) refills the bucket; deletion ends the plan", async () => {
  const store = new MemoryIdentityStore();
  const user = await freshDriver(store);
  await handleStripeEvent(store, {
    type: "checkout.session.completed",
    session: {
      id: "cs_pro2",
      customer: "cus_pro2",
      subscription: "sub_pro2",
      metadata: { kind: "subscription", accountId: user.id, accountType: "driver", plan: "pro" },
    },
  });
  const record = store.users.get(user.id);
  assert.ok(record);
  record.monthlyDiagnosesUsed = 87;

  const subEvent = (type: string, periodEnd: string): StripeCheckoutEvent => ({
    type,
    session: { id: "", customer: null, metadata: {} },
    subscription: {
      id: "sub_pro2",
      customer: "cus_pro2",
      status: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      priceId: null,
      metadata: { accountId: user.id, accountType: "driver", plan: "pro" },
    },
  });

  // First lifecycle event sets the period end — no refill (the
  // checkout already filled this cycle's bucket).
  await handleStripeEvent(store, subEvent("customer.subscription.created", "2026-12-18T00:00:00.000Z"));
  assert.equal(record.monthlyDiagnosesUsed, 87);
  assert.equal(record.currentPeriodEnd, "2026-12-18T00:00:00.000Z");

  // Renewal: the period end advances → the bucket refills.
  await handleStripeEvent(store, subEvent("customer.subscription.updated", "2027-01-18T00:00:00.000Z"));
  assert.equal(record.monthlyDiagnosesUsed, 0, "renewal refills the bucket");

  // Cancellation at deletion: back to free; the bucket view is gone.
  record.monthlyDiagnosesUsed = 12;
  await handleStripeEvent(store, subEvent("customer.subscription.deleted", "2027-01-18T00:00:00.000Z"));
  assert.equal(record.plan, "free");
  assert.equal(record.subscriptionStatus, "canceled");
  const view = await getCreditsView(store, { id: user.id, type: "driver" });
  assert.equal(view?.bucket, null);
});

// ---------------------------------------------------------------------------
// Shops: 10 free, activation, the 500 bucket, monthly reset, cancel
// ---------------------------------------------------------------------------

function seedShop(store: MemoryIdentityStore) {
  store.shops.set("shop-1", {
    id: "shop-1",
    shopName: "Fair Fix Auto",
    email: "owner@fairfix.example",
    plan: "free",
    stripeCustomerId: null,
  });
}

test("shops: 10 free diagnoses, then nothing until the plan activates the bucket", async () => {
  const store = new MemoryIdentityStore();
  seedShop(store);
  const shop = await store.findShopById("shop-1");
  assert.ok(shop);
  for (let i = 0; i < 10; i++) {
    const fresh = await store.findShopById("shop-1");
    assert.ok(fresh);
    const result = await consumeShopDiagnosis(store, fresh);
    assert.equal(result.ok, true, `free diagnosis ${i + 1}`);
    assert.equal(result.source, "free");
  }
  const exhausted = await store.findShopById("shop-1");
  assert.ok(exhausted);
  const blocked = await consumeShopDiagnosis(store, exhausted);
  assert.equal(blocked.ok, false, "no plan, no bucket — the shop waits or subscribes");
  assert.equal(blocked.freeUsed, 10);
});

test("shops: subscription activation fills the 500 bucket; cancel returns to free", async () => {
  const store = new MemoryIdentityStore();
  seedShop(store);
  assert.equal(
    await handleStripeEvent(store, {
      type: "checkout.session.completed",
      session: {
        id: "cs_shop",
        customer: "cus_shop",
        subscription: "sub_shop",
        metadata: { kind: "subscription", accountId: "shop-1", accountType: "shop", plan: "business" },
      },
    }),
    true,
  );
  let shop = await store.findShopById("shop-1");
  assert.equal(shop?.plan, "business");

  // Free allowance first (10), then the bucket.
  for (let i = 0; i < 10; i++) {
    const fresh = await store.findShopById("shop-1");
    assert.ok(fresh);
    const result = await consumeShopDiagnosis(store, fresh);
    if (!result.ok) assert.fail(`shop free diagnosis ${i + 1} should consume`);
    assert.equal(result.source, "free");
  }
  shop = await store.findShopById("shop-1");
  assert.ok(shop);
  const fromBucket = await consumeShopDiagnosis(store, shop);
  assert.equal(fromBucket.ok, true);
  assert.equal(fromBucket.source, "monthly");
  assert.equal(fromBucket.bucket?.remaining, 499);

  const view = await getCreditsView(store, { id: "shop-1", type: "shop" });
  assert.equal(view?.freeLimit, 10);
  assert.equal(view?.freeRemaining, 0);
  assert.equal(view?.bucket?.limit, 500);
  assert.equal(view?.bucket?.remaining, 499);

  // Cancellation: plan back to free, bucket gone, nothing left to spend.
  assert.equal(
    await handleStripeEvent(store, {
      type: "customer.subscription.deleted",
      session: { id: "", customer: null, metadata: {} },
      subscription: {
        id: "sub_shop",
        customer: "cus_shop",
        status: "canceled",
        currentPeriodEnd: "2027-01-18T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        priceId: null,
        metadata: { accountId: "shop-1", accountType: "shop", plan: "business" },
      },
    }),
    true,
  );
  shop = await store.findShopById("shop-1");
  assert.equal(shop?.plan, "free");
  assert.ok(shop);
  const after = await consumeShopDiagnosis(store, shop);
  assert.equal(after.ok, false);
  assert.equal(after.bucket, null);
});

test("shops: the bucket window resets monthly at consume time", async () => {
  const store = new MemoryIdentityStore();
  seedShop(store);
  const record = store.shops.get("shop-1");
  assert.ok(record);
  record.plan = "business";
  record.freeDiagnosesUsed = 10;
  record.monthlyDiagnosesUsed = 500;
  record.monthlyPeriodStart = "2026-10-01T00:00:00.000Z";
  const shop = await store.findShopById("shop-1");
  assert.ok(shop);
  const spent = await consumeShopDiagnosis(store, shop, new Date("2026-10-20T00:00:00.000Z"));
  assert.equal(spent.ok, false, "inside the window the spent bucket stays spent");
  const refilled = await consumeShopDiagnosis(store, shop, new Date("2026-11-02T00:00:00.000Z"));
  assert.equal(refilled.ok, true, "a full month on, the bucket has reset");
  assert.equal(refilled.bucket?.remaining, 499);
});
