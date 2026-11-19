/**
 * Shops free-trial tests (owner decision, 2026-11-19) — the settled
 * Shops offer:
 *
 *   Trial    14 days free + 25 diagnosis credits, no card to start.
 *            The trial ends at whichever comes first: the 14 days
 *            elapse OR the 25 trial credits are used. The window is
 *            stored on the shop record at signup (migration 0020);
 *            expiry is computed from the stored end date, never
 *            from session state.
 *   Shops    $149/month = 500 credits/month after the trial (or
 *            immediately, when a shop subscribes mid-trial — the
 *            conversion is clean: remaining trial credits draw
 *            first per the settled free-first order, the bucket is
 *            granted exactly once per checkout session).
 *
 * Also pinned here: a shop can diagnose a car ITSELF — a vehicle in
 * its own bays, typed in — through executeShopDiagnosis, consuming
 * its trial credits and saving the record against the shop. Before
 * this pass the diagnose route was driver-only and
 * consumeShopDiagnosis was never called anywhere.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "<MASKED_SECRET_001>";
process.env.CLIENT_URL = "https://mechatech.test";
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;

import { MemoryAppStore } from "../lib/server/appStore";
import { getCreditsView } from "../lib/server/billingService";
import { registerBusiness } from "../lib/server/businessService";
import {
  consumeShopDiagnosis,
  shopQuotaStateFor,
  shopTrialView,
  shopTrialWindow,
} from "../lib/server/credits";
import {
  executeShopDiagnosis,
  ShopQuotaExhaustedError,
  type ShopDiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { SHOP_TRIAL_CREDITS, SHOP_TRIAL_DAYS } from "../lib/server/pricing";
import { MemoryIdentityStore, type ShopRecord } from "../lib/server/store";
import { handleStripeEvent } from "../lib/server/stripe";

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-11-19T12:00:00.000Z");

function seedShop(
  store: MemoryIdentityStore,
  overrides: Partial<ShopRecord> = {},
): ShopRecord {
  const record: ShopRecord = {
    id: "shop-trial",
    shopName: "Trial Auto",
    email: "trial@fairfix.example",
    plan: "free",
    stripeCustomerId: null,
    freeDiagnosesUsed: 0,
    trialStartedAt: T0.toISOString(),
    trialEndsAt: new Date(T0.getTime() + SHOP_TRIAL_DAYS * DAY_MS).toISOString(),
    ...overrides,
  };
  store.shops.set(record.id, record);
  return record;
}

async function collect(
  gen: AsyncGenerator<ShopDiagnoseServiceEvent>,
): Promise<ShopDiagnoseServiceEvent[]> {
  const events: ShopDiagnoseServiceEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

/* ------------------------- the window ------------------------- */

test("trial window: signup stamps a 14-day window on the shop record", () => {
  const { startedAt, endsAt } = shopTrialWindow(T0);
  assert.equal(startedAt, T0.toISOString());
  assert.equal(new Date(endsAt).getTime() - T0.getTime(), 14 * DAY_MS);
  assert.equal(SHOP_TRIAL_DAYS, 14);
  assert.equal(SHOP_TRIAL_CREDITS, 25);
});

test("trial view: active inside the window, ends on time at the stored end date", () => {
  const shop = seedShop(new MemoryIdentityStore());
  const mid = shopTrialView(shop, new Date(T0.getTime() + 3 * DAY_MS));
  assert.equal(mid.active, true);
  assert.equal(mid.daysLeft, 11);
  assert.equal(mid.creditsRemaining, 25);
  assert.equal(mid.endedReason, null);

  const justBefore = shopTrialView(shop, new Date(T0.getTime() + 14 * DAY_MS - 1));
  assert.equal(justBefore.active, true, "one millisecond before the end, the trial still runs");

  const atEnd = shopTrialView(shop, new Date(T0.getTime() + 14 * DAY_MS));
  assert.equal(atEnd.active, false);
  assert.equal(atEnd.endedReason, "time");
  assert.equal(atEnd.daysLeft, 0);
  assert.equal(atEnd.creditsRemaining, 25, "unused credits lapse with the window — they are not spendable after");
});

test("trial view: spending all 25 credits ends the trial inside its window", () => {
  const shop = seedShop(new MemoryIdentityStore(), { freeDiagnosesUsed: 25 });
  const view = shopTrialView(shop, new Date(T0.getTime() + 2 * DAY_MS));
  assert.equal(view.active, false);
  assert.equal(view.endedReason, "credits");
  assert.equal(view.daysLeft, 12, "the clock still shows — the credits ended it, not the days");
});

test("trial view: a subscribed shop reports no trial end; a windowless legacy shop has no trial", () => {
  const subscribed = seedShop(new MemoryIdentityStore(), { plan: "business" });
  const subView = shopTrialView(subscribed, new Date(T0.getTime() + 30 * DAY_MS));
  assert.equal(subView.endedReason, null, "the plan, not the trial, governs a subscribed shop");

  const legacy = seedShop(new MemoryIdentityStore(), {
    trialStartedAt: null,
    trialEndsAt: null,
  });
  const legacyView = shopTrialView(legacy, T0);
  assert.equal(legacyView.active, false, "no stored window — no trial (pre-0020 record)");
  assert.equal(legacyView.endedReason, "time");
});

/* ------------------------- consumption ------------------------- */

test("consume: after the 14 days, unused trial credits no longer spend", async () => {
  const store = new MemoryIdentityStore();
  const shop = seedShop(store);
  const after = new Date(T0.getTime() + 15 * DAY_MS);
  const blocked = await consumeShopDiagnosis(store, shop, after);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.freeUsed, 0, "nothing was consumed");
  assert.equal(blocked.trial?.endedReason, "time");
  const state = shopQuotaStateFor(shop, after);
  assert.equal(state.canDiagnose, false);
  assert.equal(state.plan, "free");
});

test("consume: the 25th credit spends, the 26th is refused inside the window", async () => {
  const store = new MemoryIdentityStore();
  seedShop(store, { freeDiagnosesUsed: 24 });
  const shop = await store.findShopById("shop-trial");
  assert.ok(shop);
  const during = new Date(T0.getTime() + 1 * DAY_MS);
  const last = await consumeShopDiagnosis(store, shop, during);
  assert.equal(last.ok, true);
  assert.equal(last.source, "free");
  const fresh = await store.findShopById("shop-trial");
  assert.ok(fresh);
  const refused = await consumeShopDiagnosis(store, fresh, during);
  assert.equal(refused.ok, false);
  assert.equal(refused.trial?.endedReason, "credits");
});

/* ------------------- shop-initiated diagnosis ------------------- */

test("shop diagnosis: a shop diagnoses a car in its own bays on trial credits", async () => {
  const store = new MemoryIdentityStore();
  const shop = seedShop(store);
  const provider = new StubDiagnosisProvider();
  const events = await collect(
    executeShopDiagnosis(
      { store, provider },
      {
        shop,
        request: {
          problem: "Customer's sedan crunches when braking",
          vehicleInfo: "2019 Honda Accord",
        },
      },
    ),
  );
  const done = events.find((e) => e.type === "done") as
    | Extract<ShopDiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done, "the shop's own diagnosis completes");
  assert.equal(provider.calls.length, 1);
  assert.equal(done.quota.remaining, 24, "one trial credit consumed");
  assert.ok(done.diagnosisId, "the run was saved");
  const saved = await store.findDiagnosisRecord(done.diagnosisId as string);
  assert.ok(saved);
  assert.equal(saved.shopId, "shop-trial", "the record belongs to the shop");
  assert.equal(saved.userId, null, "no driver owns a shop run");
  assert.equal(saved.vehicleInfo, "2019 Honda Accord");
});

test("shop diagnosis: an ended trial refuses BEFORE any provider call", async () => {
  const store = new MemoryIdentityStore();
  const shop = seedShop(store, {
    trialEndsAt: new Date(T0.getTime() - DAY_MS).toISOString(),
  });
  const provider = new StubDiagnosisProvider();
  await assert.rejects(
    collect(
      executeShopDiagnosis(
        { store, provider },
        { shop, request: { problem: "Won't start", vehicleInfo: "2015 Ford F-150" } },
      ),
    ),
    (err: unknown) => err instanceof ShopQuotaExhaustedError,
  );
  assert.equal(provider.calls.length, 0, "no AI spend behind an ended trial");
});

/* ------------------- signup + mid-trial conversion ------------------- */

test("signup: registering a shop stamps the trial window on its record", async () => {
  const appStore = new MemoryAppStore();
  const before = Date.now();
  const result = await registerBusiness(appStore, "shop", {
    shopName: "Fresh Bay Auto",
    email: "fresh@bay.example",
    phone: "(617) 555-0142",
    password: "<MASKED_SECRET_002>",
    zip: "02118",
  });
  const after = Date.now();
  if (result.business.type !== "shop") assert.fail("a shop registration returns the shop profile");
  assert.ok(result.business.trialStartedAt);
  assert.ok(result.business.trialEndsAt);
  const started = new Date(result.business.trialStartedAt as string).getTime();
  const ended = new Date(result.business.trialEndsAt as string).getTime();
  assert.ok(started >= before && started <= after, "the window starts at signup");
  assert.equal(ended - started, 14 * DAY_MS, "and runs exactly 14 days");
});

test("conversion: subscribing mid-trial is clean — trial credits draw first, bucket granted once", async () => {
  const store = new MemoryIdentityStore();
  seedShop(store, { freeDiagnosesUsed: 10 });
  const checkout = {
    type: "checkout.session.completed" as const,
    session: {
      id: "cs_trial_convert",
      customer: "cus_trial",
      subscription: "sub_trial",
      metadata: { kind: "subscription", accountId: "shop-trial", accountType: "shop", plan: "business" },
    },
  };
  assert.equal(await handleStripeEvent(store, checkout), true);
  let shop = await store.findShopById("shop-trial");
  assert.equal(shop?.plan, "business");

  // Remaining trial credits (15) draw before the bucket — no
  // double-grant of a second free pool on conversion.
  const during = new Date(T0.getTime() + 2 * DAY_MS);
  for (let i = 0; i < 15; i++) {
    const fresh = await store.findShopById("shop-trial");
    assert.ok(fresh);
    const result = await consumeShopDiagnosis(store, fresh, during);
    if (!result.ok) assert.fail(`post-conversion free diagnosis ${i + 1} should consume`);
    assert.equal(result.source, "free");
  }
  shop = await store.findShopById("shop-trial");
  assert.ok(shop);
  const fromBucket = await consumeShopDiagnosis(store, shop, during);
  assert.equal(fromBucket.ok, true);
  assert.equal(fromBucket.source, "monthly");
  assert.equal(fromBucket.bucket?.remaining, 499);

  // A webhook replay of the same session grants nothing twice and
  // does not reset the partially used bucket (0020 session gate).
  await handleStripeEvent(store, checkout);
  const view = await getCreditsView(store, { id: "shop-trial", type: "shop" });
  assert.equal(view?.bucket?.remaining, 499, "no re-grant, no reset on replay");
  assert.equal(view?.freeRemaining, 0);
});
