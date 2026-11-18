"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "wp5-test-secret";
process.env.STRIPE_PRO_PRICE_ID = "price_pro_test";
process.env.STRIPE_BUSINESS_PRICE_ID = "price_business_test";
process.env.CLIENT_URL = "https://mechatech.test";
const authService_1 = require("../lib/server/authService");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const identity_1 = require("../lib/server/identity");
const jwt_1 = require("../lib/server/jwt");
const provider_1 = require("../lib/server/provider");
const quota_1 = require("../lib/server/quota");
const store_1 = require("../lib/server/store");
const stripe_1 = require("../lib/server/stripe");
const DRIVER = {
    name: "Test Driver",
    email: "Driver@Example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
};
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
function doneEvent(events) {
    const done = events.filter((e) => e.type === "done");
    strict_1.default.equal(done.length, 1, "exactly one done event");
    return done[0];
}
(0, node_test_1.test)("identity normalization: email + phone canonical forms", () => {
    strict_1.default.equal((0, identity_1.normalizeEmail)("  Driver@Example.COM "), "driver@example.com");
    strict_1.default.equal((0, identity_1.normalizeEmail)("not-an-email"), null);
    strict_1.default.equal((0, identity_1.normalizePhone)("(617) 555-0134"), "+16175550134");
    strict_1.default.equal((0, identity_1.normalizePhone)("617-555-0134"), "+16175550134");
    strict_1.default.equal((0, identity_1.normalizePhone)("+1 617 555 0134"), "+16175550134");
    strict_1.default.equal((0, identity_1.normalizePhone)("16175550134"), "+16175550134");
    strict_1.default.equal((0, identity_1.normalizePhone)("123"), null);
});
(0, node_test_1.test)("countdown copy: exact remaining values + the zero message", () => {
    strict_1.default.equal((0, quota_1.countdownMessage)(4), "You have 4 free diagnoses left.");
    strict_1.default.equal((0, quota_1.countdownMessage)(2), "You have 2 free diagnoses left.");
    strict_1.default.equal((0, quota_1.countdownMessage)(1), "You have 1 free diagnosis left.");
    const zero = (0, quota_1.countdownMessage)(0);
    strict_1.default.ok(zero.includes("used all 5 of your free diagnoses"));
    strict_1.default.ok(zero.includes("subscription is required"));
    strict_1.default.equal((0, quota_1.countdownMessage)(null), "Pro plan — unlimited diagnoses.");
});
(0, node_test_1.test)("(a)+(e) quota decrements 5→0 and every response states the countdown", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    const auth = await (0, authService_1.registerDriver)(store, DRIVER);
    strict_1.default.equal(auth.quota.remaining, 5);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    const expectedRemaining = [4, 3, 2, 1, 0];
    for (let i = 0; i < 5; i++) {
        const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, {
            user: (await store.findUserById(user.id)) ?? user,
            // Distinct problem per run so the answer cache cannot shortcut.
            request: { problem: `Strange noise variant ${i} when braking` },
        }));
        const done = doneEvent(events);
        strict_1.default.equal(done.quota.remaining, expectedRemaining[i], `diagnosis ${i + 1} remaining`);
        strict_1.default.equal(done.message, (0, quota_1.countdownMessage)(expectedRemaining[i]));
        const quotaEvent = events.find((e) => e.type === "quota");
        strict_1.default.ok(quotaEvent, "stream opens with a quota event");
        strict_1.default.equal(quotaEvent.quota.remaining, expectedRemaining[i]);
    }
    const after = await store.findUserById(user.id);
    strict_1.default.equal(after?.freeDiagnosesUsed, 5);
    strict_1.default.equal(provider.calls.length, 5);
});
(0, node_test_1.test)("(d) the 6th diagnosis is refused BEFORE any AI call", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    for (let i = 0; i < 5; i++) {
        await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: (await store.findUserById(user.id)) ?? user, request: { problem: `problem ${i}` } }));
    }
    strict_1.default.equal(provider.calls.length, 5);
    await strict_1.default.rejects(collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: (await store.findUserById(user.id)) ?? user, request: { problem: "one more" } })), (err) => {
        strict_1.default.ok(err instanceof quota_1.QuotaExhaustedError);
        strict_1.default.equal(err.quota.remaining, 0);
        strict_1.default.equal(err.quota.canDiagnose, false);
        return true;
    });
    strict_1.default.equal(provider.calls.length, 5, "provider must never be invoked for a blocked user");
});
(0, node_test_1.test)("(b) re-registration with the same email does not reset the quota", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    for (let i = 0; i < 5; i++) {
        await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: (await store.findUserById(user.id)) ?? user, request: { problem: `p${i}` } }));
    }
    // The old app's leak: sign out, sign up again, get 5 fresh. Here the
    // second registration is refused as the SAME identity…
    await strict_1.default.rejects((0, authService_1.registerDriver)(store, { ...DRIVER, name: "Same Person Again" }), (err) => {
        strict_1.default.ok(err instanceof store_1.IdentityConflictError);
        strict_1.default.equal(err.field, "email");
        return true;
    });
    strict_1.default.equal(store.users.size, 1, "no second identity may be created");
    // …and signing in returns the same account with the quota exhausted.
    const login = await (0, authService_1.loginDriver)(store, { email: DRIVER.email, password: DRIVER.password });
    strict_1.default.equal(login.quota.remaining, 0);
    strict_1.default.equal(login.quota.canDiagnose, false);
    await strict_1.default.rejects(collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: (await store.findUserById(user.id)) ?? user, request: { problem: "reset attempt" } })), quota_1.QuotaExhaustedError);
    strict_1.default.equal(provider.calls.length, 5);
});
(0, node_test_1.test)("(c) re-registration with the same phone under a different email does not reset", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, DRIVER);
    await strict_1.default.rejects((0, authService_1.registerDriver)(store, {
        name: "Different Email Same Phone",
        email: "someone.else@example.org",
        phone: "6175550134", // same number, different formatting
        password: "another password",
    }), (err) => {
        strict_1.default.ok(err instanceof store_1.IdentityConflictError);
        strict_1.default.equal(err.field, "phone");
        return true;
    });
    strict_1.default.equal(store.users.size, 1);
    const original = await store.findUserByEmail("driver@example.com");
    strict_1.default.equal(original?.freeDiagnosesUsed, 0);
});
(0, node_test_1.test)("pro plan bypasses the quota entirely; deep tier is pro-only", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    // Free user asking for the deep tier: refused, and NO quota consumed.
    await strict_1.default.rejects(collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: { problem: "deep please", tier: "deep" } })), diagnoseService_1.ProRequiredError);
    strict_1.default.equal(provider.calls.length, 0);
    strict_1.default.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 0);
    // Upgrade to Pro (as the webhook would), then diagnoses never decrement.
    await store.applyPlanUpdate({ accountType: "driver", accountId: user.id, plan: "pro" });
    const pro = await store.findUserById(user.id);
    strict_1.default.ok(pro);
    for (let i = 0; i < 7; i++) {
        const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: pro, request: { problem: `pro problem ${i}` } }));
        const done = doneEvent(events);
        strict_1.default.equal(done.quota.remaining, null);
        strict_1.default.equal(done.quota.canDiagnose, true);
    }
    strict_1.default.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 0);
    strict_1.default.equal(provider.calls.length, 7);
});
(0, node_test_1.test)("exact-match cache: a repeat question costs no AI call (quota still counts)", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    const request = { problem: "Grinding when I brake", vehicleInfo: "2019 Honda Accord" };
    const first = doneEvent(await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request })));
    strict_1.default.equal(first.source, "model");
    const fresh = (await store.findUserById(user.id)) ?? user;
    const second = doneEvent(await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: fresh, request })));
    strict_1.default.equal(second.source, "cache");
    strict_1.default.equal(provider.calls.length, 1, "the repeat must not call the provider");
    strict_1.default.equal(second.quota.remaining, 3, "each diagnosis still counts against the 5");
});
(0, node_test_1.test)("latency is measured and surfaced on the done event", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider({ delayMs: 1 });
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    const done = doneEvent(await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: { problem: "latency check" } })));
    strict_1.default.ok(done.latency, "latency present");
    strict_1.default.ok(done.latency.ttftMs >= 0);
    strict_1.default.ok(done.latency.totalMs >= done.latency.ttftMs);
});
(0, node_test_1.test)("JWT payload carries {id, type} and NO email (legacy checkout bug guard)", () => {
    const token = (0, jwt_1.signToken)({ id: "user-1", type: "driver" });
    const payload = (0, jwt_1.verifyToken)(token);
    strict_1.default.ok(payload);
    strict_1.default.equal(payload.id, "user-1");
    strict_1.default.equal(payload.type, "driver");
    strict_1.default.equal(payload.email, undefined);
    strict_1.default.ok(payload.exp - payload.iat >= 30 * 24 * 60 * 60 - 5, "30-day expiry");
});
(0, node_test_1.test)("stripe checkout takes the email from the account record (bug a)", async () => {
    const store = new store_1.MemoryIdentityStore();
    const stripe = new stripe_1.StubStripeClient();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    const result = await (0, stripe_1.createSubscriptionCheckout)({
        stripe,
        accountId: user.id,
        accountType: "driver",
        accountEmail: user.email, // from the persisted record, never the token
        plan: "pro",
    });
    strict_1.default.ok(result.url);
    strict_1.default.equal(stripe.sessions.length, 1);
    strict_1.default.equal(stripe.sessions[0].customerEmail, "driver@example.com");
    strict_1.default.equal(stripe.sessions[0].priceId, "price_pro_test");
    strict_1.default.equal(stripe.sessions[0].metadata.accountType, "driver");
});
(0, node_test_1.test)("stripe webhook updates SHOP accounts as well as drivers (bug b)", async () => {
    const store = new store_1.MemoryIdentityStore();
    const stripe = new stripe_1.StubStripeClient();
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
    const updated = await (0, stripe_1.handleStripeEvent)(store, stripe.constructEvent("{}", "sig"));
    strict_1.default.equal(updated, true);
    const shop = await store.findShopById("shop-1");
    strict_1.default.equal(shop?.plan, "business");
    strict_1.default.equal(shop?.stripeCustomerId, "cus_shop_1");
    // And the driver path still works.
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail("driver@example.com");
    strict_1.default.ok(user);
    stripe.event = {
        type: "checkout.session.completed",
        session: {
            id: "cs_2",
            customer: "cus_driver_1",
            metadata: { accountId: user.id, accountType: "driver", plan: "pro" },
        },
    };
    strict_1.default.equal(await (0, stripe_1.handleStripeEvent)(store, stripe.constructEvent("{}", "sig")), true);
    strict_1.default.equal((await store.findUserById(user.id))?.plan, "pro");
});
