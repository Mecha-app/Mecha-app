/**
 * WP5 acceptance tests — accounts, persistent free quota, diagnosis.
 *
 * Run: npm test  (compiles lib/server + tests to tests/.build, then
 * node --test). Everything runs against the in-memory store and the
 * recording stub provider: NO real database, NO real Anthropic call,
 * NO real Stripe call — by design.
 *
 * The owner's acceptance cases:
 *   (a) quota decrements 5 → 0 across diagnoses
 *   (b) re-registration with the same email does not reset
 *   (c) re-registration with the same phone under a different email
 *       does not reset
 *   (d) the 6th diagnosis is refused BEFORE any AI call
 *   (e) countdown values are correct in responses
 * Plus: Pro bypass, deep-tier gate, exact-match cache, latency fields,
 * JWT payload shape (no email — the legacy checkout bug), Stripe
 * checkout email-from-record, Stripe webhook updating a SHOP.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "wp5-test-secret";
process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
process.env.STRIPE_BUSINESS_PRICE_ID = "price_business_test";
process.env.CLIENT_URL = "https://mechatech.test";

import { loginDriver, registerDriver } from "../lib/server/authService";
import {
  ProRequiredError,
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import { normalizeEmail, normalizePhone } from "../lib/server/identity";
import { signToken, verifyToken } from "../lib/server/jwt";
import { StubDiagnosisProvider } from "../lib/server/provider";
import {
  QuotaExhaustedError,
  countdownMessage,
} from "../lib/server/quota";
import { IdentityConflictError, MemoryIdentityStore } from "../lib/server/store";
import {
  StubStripeClient,
  createSubscriptionCheckout,
  handleStripeEvent,
} from "../lib/server/stripe";

const DRIVER = {
  name: "Test Driver",
  email: "Driver@Example.com",
  phone: "(617) 555-0134",
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

test("identity normalization: email + phone canonical forms", () => {
  assert.equal(normalizeEmail("  Driver@Example.COM "), "driver@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizePhone("(617) 555-0134"), "+16175550134");
  assert.equal(normalizePhone("617-555-0134"), "+16175550134");
  assert.equal(normalizePhone("+1 617 555 0134"), "+16175550134");
  assert.equal(normalizePhone("16175550134"), "+16175550134");
  assert.equal(normalizePhone("123"), null);
});

test("countdown copy: exact remaining values + the zero message", () => {
  assert.equal(countdownMessage(4), "You have 4 free diagnoses left.");
  assert.equal(countdownMessage(2), "You have 2 free diagnoses left.");
  assert.equal(countdownMessage(1), "You have 1 free diagnosis left.");
  const zero = countdownMessage(0);
  assert.ok(zero.includes("used all 5 of your free diagnoses"));
  assert.ok(zero.includes("subscription is required"));
  assert.equal(countdownMessage(null), "Pro plan — unlimited diagnoses.");
});

test("(a)+(e) quota decrements 5→0 and every response states the countdown", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const auth = await registerDriver(store, DRIVER);
  assert.equal(auth.quota.remaining, 5);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);

  const expectedRemaining = [4, 3, 2, 1, 0];
  for (let i = 0; i < 5; i++) {
    const events = await collect(
      executeDiagnosis(
        { store, provider },
        {
          user: (await store.findUserById(user.id)) ?? user,
          // Distinct problem per run so the answer cache cannot shortcut.
          request: { problem: `Strange noise variant ${i} when braking` },
        },
      ),
    );
    const done = doneEvent(events);
    assert.equal(done.quota.remaining, expectedRemaining[i], `diagnosis ${i + 1} remaining`);
    assert.equal(done.message, countdownMessage(expectedRemaining[i]));
    const quotaEvent = events.find((e) => e.type === "quota") as
      | Extract<DiagnoseServiceEvent, { type: "quota" }>
      | undefined;
    assert.ok(quotaEvent, "stream opens with a quota event");
    assert.equal(quotaEvent.quota.remaining, expectedRemaining[i]);
  }

  const after = await store.findUserById(user.id);
  assert.equal(after?.freeDiagnosesUsed, 5);
  assert.equal(provider.calls.length, 5);
});

test("(d) the 6th diagnosis is refused BEFORE any AI call", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);
  for (let i = 0; i < 5; i++) {
    await collect(
      executeDiagnosis(
        { store, provider },
        { user: (await store.findUserById(user.id)) ?? user, request: { problem: `problem ${i}` } },
      ),
    );
  }
  assert.equal(provider.calls.length, 5);

  await assert.rejects(
    collect(
      executeDiagnosis(
        { store, provider },
        { user: (await store.findUserById(user.id)) ?? user, request: { problem: "one more" } },
      ),
    ),
    (err: unknown) => {
      assert.ok(err instanceof QuotaExhaustedError);
      assert.equal(err.quota.remaining, 0);
      assert.equal(err.quota.canDiagnose, false);
      return true;
    },
  );
  assert.equal(provider.calls.length, 5, "provider must never be invoked for a blocked user");
});

test("(b) re-registration with the same email does not reset the quota", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);
  for (let i = 0; i < 5; i++) {
    await collect(
      executeDiagnosis(
        { store, provider },
        { user: (await store.findUserById(user.id)) ?? user, request: { problem: `p${i}` } },
      ),
    );
  }

  // The old app's leak: sign out, sign up again, get 5 fresh. Here the
  // second registration is refused as the SAME identity…
  await assert.rejects(
    registerDriver(store, { ...DRIVER, name: "Same Person Again" }),
    (err: unknown) => {
      assert.ok(err instanceof IdentityConflictError);
      assert.equal(err.field, "email");
      return true;
    },
  );
  assert.equal(store.users.size, 1, "no second identity may be created");

  // …and signing in returns the same account with the quota exhausted.
  const login = await loginDriver(store, { email: DRIVER.email, password: DRIVER.password });
  assert.equal(login.quota.remaining, 0);
  assert.equal(login.quota.canDiagnose, false);
  await assert.rejects(
    collect(
      executeDiagnosis(
        { store, provider },
        { user: (await store.findUserById(user.id)) ?? user, request: { problem: "reset attempt" } },
      ),
    ),
    QuotaExhaustedError,
  );
  assert.equal(provider.calls.length, 5);
});

test("(c) re-registration with the same phone under a different email does not reset", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);
  await assert.rejects(
    registerDriver(store, {
      name: "Different Email Same Phone",
      email: "someone.else@example.org",
      phone: "6175550134", // same number, different formatting
      password: "another password",
    }),
    (err: unknown) => {
      assert.ok(err instanceof IdentityConflictError);
      assert.equal(err.field, "phone");
      return true;
    },
  );
  assert.equal(store.users.size, 1);
  const original = await store.findUserByEmail("driver@example.com");
  assert.equal(original?.freeDiagnosesUsed, 0);
});

test("pro plan bypasses the quota entirely; deep tier is pro-only", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);

  // Free user asking for the deep tier: refused, and NO quota consumed.
  await assert.rejects(
    collect(
      executeDiagnosis(
        { store, provider },
        { user, request: { problem: "deep please", tier: "deep" } },
      ),
    ),
    ProRequiredError,
  );
  assert.equal(provider.calls.length, 0);
  assert.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 0);

  // Upgrade to Pro (as the webhook would), then diagnoses never decrement.
  await store.applyPlanUpdate({ accountType: "driver", accountId: user.id, plan: "pro" });
  const pro = await store.findUserById(user.id);
  assert.ok(pro);
  for (let i = 0; i < 7; i++) {
    const events = await collect(
      executeDiagnosis(
        { store, provider },
        { user: pro, request: { problem: `pro problem ${i}` } },
      ),
    );
    const done = doneEvent(events);
    assert.equal(done.quota.remaining, null);
    assert.equal(done.quota.canDiagnose, true);
  }
  assert.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 0);
  assert.equal(provider.calls.length, 7);
});

test("exact-match cache: a repeat question costs no AI call (quota still counts)", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);
  const request = { problem: "Grinding when I brake", vehicleInfo: "2019 Honda Accord" };

  const first = doneEvent(
    await collect(executeDiagnosis({ store, provider }, { user, request })),
  );
  assert.equal(first.source, "model");
  const fresh = (await store.findUserById(user.id)) ?? user;
  const second = doneEvent(
    await collect(executeDiagnosis({ store, provider }, { user: fresh, request })),
  );
  assert.equal(second.source, "cache");
  assert.equal(provider.calls.length, 1, "the repeat must not call the provider");
  assert.equal(second.quota.remaining, 3, "each diagnosis still counts against the 5");
});

test("latency is measured and surfaced on the done event", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider({ delayMs: 1 });
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);
  const done = doneEvent(
    await collect(
      executeDiagnosis({ store, provider }, { user, request: { problem: "latency check" } }),
    ),
  );
  assert.ok(done.latency, "latency present");
  assert.ok(done.latency.ttftMs >= 0);
  assert.ok(done.latency.totalMs >= done.latency.ttftMs);
});

test("JWT payload carries {id, type} and NO email (legacy checkout bug guard)", () => {
  const token = signToken({ id: "user-1", type: "driver" });
  const payload = verifyToken(token);
  assert.ok(payload);
  assert.equal(payload.id, "user-1");
  assert.equal(payload.type, "driver");
  assert.equal((payload as unknown as Record<string, unknown>).email, undefined);
  assert.ok(payload.exp - payload.iat >= 30 * 24 * 60 * 60 - 5, "30-day expiry");
});

test("stripe checkout takes the email from the account record (bug a)", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);
  const result = await createSubscriptionCheckout({
    stripe,
    accountId: user.id,
    accountType: "driver",
    accountEmail: user.email, // from the persisted record, never the token
    plan: "pro",
  });
  assert.ok(result.url);
  assert.equal(stripe.sessions.length, 1);
  assert.equal(stripe.sessions[0].customerEmail, "driver@example.com");
  assert.equal(stripe.sessions[0].priceId, "price_pro_test");
  assert.equal(stripe.sessions[0].metadata.accountType, "driver");
});

test("stripe webhook updates SHOP accounts as well as drivers (bug b)", async () => {
  const store = new MemoryIdentityStore();
  const stripe = new StubStripeClient();

  // Seed a shop the way the ETL would.
  store.shops.set("shop-1", {
    id: "shop-1",
    shopName: "Fair Fix Auto",
    email: "owner@fairfix.example",
    plan: "free",
    stripeCustomerId: null,
  });
  stripe.event = {
    type: "checkout.session.completed",
    session: {
      id: "cs_1",
      customer: "cus_shop_1",
      metadata: { accountId: "shop-1", accountType: "shop", plan: "business" },
    },
  };
  const updated = await handleStripeEvent(store, stripe.constructEvent("{}", "sig"));
  assert.equal(updated, true);
  const shop = await store.findShopById("shop-1");
  assert.equal(shop?.plan, "business");
  assert.equal(shop?.stripeCustomerId, "cus_shop_1");

  // And the driver path still works.
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail("driver@example.com");
  assert.ok(user);
  stripe.event = {
    type: "checkout.session.completed",
    session: {
      id: "cs_2",
      customer: "cus_driver_1",
      metadata: { accountId: user.id, accountType: "driver", plan: "pro" },
    },
  };
  assert.equal(await handleStripeEvent(store, stripe.constructEvent("{}", "sig")), true);
  assert.equal((await store.findUserById(user.id))?.plan, "pro");
});
