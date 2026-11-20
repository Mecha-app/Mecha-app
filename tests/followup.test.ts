/**
 * Follow-up pass tests (2026-11-20) — the owner's re-review fixes:
 *
 *   Item 1  Button unity: "Check a repair price" lands on the same
 *           door as the hero button (/app/diagnose).
 *   Item 2  The logged-out diagnose door: bounce to the explanatory
 *           register page with the return path saved.
 *   Item 3  "20 seconds" honesty: the register line now says about
 *           a minute, in every locale.
 *   Item 5  No three months free: the early-member claim is gone
 *           from every locale; Pro bills from month one.
 *   Item 6  The $4 Single reads as the no-subscription path.
 *   Item 7  Shops free tier = 20 diagnoses, no day limit, for
 *           'free20' shops; 'legacy' shops keep 14 days + 25.
 *   Item 7b "Upgrade now" at the shop limit + in billing.
 *   Item 9  The shop diagnose panel's three doors (VIN / manual /
 *           code) wired to the real endpoints.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "followup-test-secret";
process.env.CLIENT_URL = "https://mechatech.test";
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;

import en from "../lib/i18n/dictionaries/en";
import { LOCALES, getDictionary } from "../lib/i18n";
import { getCreditsView } from "../lib/server/billingService";
import {
  consumeShopDiagnosis,
  shopCountdownMessage,
  shopFreeTermsOf,
  shopPaywallMessage,
  shopQuotaStateFor,
} from "../lib/server/credits";
import { codeStructure, faultCodePage } from "../lib/server/faultCodes";
import { SHOP_FREE20_LIMIT } from "../lib/server/pricing";
import { MemoryIdentityStore, type ShopRecord } from "../lib/server/store";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date("2026-11-20T12:00:00.000Z");

function seedShop(
  store: MemoryIdentityStore,
  overrides: Partial<ShopRecord> = {},
): ShopRecord {
  const record: ShopRecord = {
    id: "shop-followup",
    shopName: "Followup Auto",
    email: "followup@fairfix.example",
    plan: "free",
    stripeCustomerId: null,
    freeDiagnosesUsed: 0,
    trialStartedAt: T0.toISOString(),
    trialEndsAt: new Date(T0.getTime() + 14 * DAY_MS).toISOString(),
    ...overrides,
  };
  store.shops.set(record.id, record);
  return record;
}

/* ------------------------------ item 7 ------------------------------ */

test("free20: terms resolution — only the 'free20' stamp gets the new terms", () => {
  const base = seedShop(new MemoryIdentityStore());
  assert.equal(shopFreeTermsOf(base), "legacy", "no stamp = legacy (pre-migration records)");
  assert.equal(shopFreeTermsOf({ ...base, freeTerms: "legacy" }), "legacy");
  assert.equal(shopFreeTermsOf({ ...base, freeTerms: "free20" }), "free20");
  assert.equal(SHOP_FREE20_LIMIT, 20);
});

test("free20: the count is the limit — an old trial window does NOT block", () => {
  const store = new MemoryIdentityStore();
  const shop = seedShop(store, {
    freeTerms: "free20",
    trialStartedAt: new Date(T0.getTime() - 90 * DAY_MS).toISOString(),
    trialEndsAt: new Date(T0.getTime() - 76 * DAY_MS).toISOString(),
  });
  const state = shopQuotaStateFor(shop, T0);
  assert.equal(state.terms, "free20");
  assert.equal(state.limit, 20);
  assert.equal(state.remaining, 20);
  assert.equal(state.canDiagnose, true, "90 days on, all 20 still available — no day limit");
  const almost = shopQuotaStateFor({ ...shop, freeDiagnosesUsed: 19 }, T0);
  assert.equal(almost.remaining, 1);
  assert.equal(almost.canDiagnose, true);
  const spent = shopQuotaStateFor({ ...shop, freeDiagnosesUsed: 20 }, T0);
  assert.equal(spent.remaining, 0);
  assert.equal(spent.canDiagnose, false, "diagnosis 21 needs the subscription");
});

test("free20: consume stops at exactly 20, whenever they are used", async () => {
  const store = new MemoryIdentityStore();
  const shop = seedShop(store, {
    freeTerms: "free20",
    freeDiagnosesUsed: 19,
    trialEndsAt: new Date(T0.getTime() - 30 * DAY_MS).toISOString(),
  });
  const twentieth = await consumeShopDiagnosis(store, shop, T0);
  assert.equal(twentieth.ok, true, "the 20th diagnosis runs, long past any 14-day window");
  assert.equal(twentieth.freeUsed, 20);
  const twentyFirst = await consumeShopDiagnosis(
    store,
    { ...shop, freeDiagnosesUsed: 20 },
    T0,
  );
  assert.equal(twentyFirst.ok, false, "the 21st is refused on the free shelf");
});

test("legacy: grandfathered shops keep 14 days + 25, exactly as promised", async () => {
  const store = new MemoryIdentityStore();
  const inWindow = seedShop(store, { freeDiagnosesUsed: 24 });
  const state = shopQuotaStateFor(inWindow, T0);
  assert.equal(state.terms, "legacy");
  assert.equal(state.limit, 25);
  assert.equal(state.remaining, 1);
  const twentyFifth = await consumeShopDiagnosis(store, inWindow, T0);
  assert.equal(twentyFifth.ok, true, "the 25th trial diagnosis still runs inside the window");
  const expired = seedShop(store, {
    id: "shop-legacy-expired",
    trialStartedAt: new Date(T0.getTime() - 20 * DAY_MS).toISOString(),
    trialEndsAt: new Date(T0.getTime() - 6 * DAY_MS).toISOString(),
  });
  const refused = await consumeShopDiagnosis(store, expired, T0);
  assert.equal(refused.ok, false, "a legacy shop past its window is done — those were its terms");
});

test("free20: the credits view shows the shop its own count — no trial line", async () => {
  const store = new MemoryIdentityStore();
  seedShop(store, { freeTerms: "free20", freeDiagnosesUsed: 7 });
  const view = await getCreditsView(store, { id: "shop-followup", type: "shop" });
  assert.equal(view?.freeLimit, 20);
  assert.equal(view?.freeUsed, 7);
  assert.equal(view?.freeRemaining, 13);
  assert.equal(view?.trial, null, "no trial state is rendered for a free20 shop");
  assert.equal(view?.free?.exhausted, false);
  const store2 = new MemoryIdentityStore();
  seedShop(store2, { freeTerms: "free20", freeDiagnosesUsed: 20 });
  const spent = await getCreditsView(store2, { id: "shop-followup", type: "shop" });
  assert.equal(spent?.free?.exhausted, true, "at the limit the dashboard says so, plainly");
});

test("free20: countdown + paywall words carry the count, never the trial", () => {
  const store = new MemoryIdentityStore();
  const shop = seedShop(store, { freeTerms: "free20", freeDiagnosesUsed: 3 });
  const msg = shopCountdownMessage(shopQuotaStateFor(shop, T0));
  assert.ok(msg.includes("17 free diagnoses left (of your 20 free)"), msg);
  const wall = shopPaywallMessage(
    shopQuotaStateFor({ ...shop, freeDiagnosesUsed: 20 }, T0),
  );
  assert.ok(wall.includes("You've used your 20 free diagnoses"), wall);
  assert.ok(!/trial/i.test(wall), "no trial language for a free20 shop");
});

/* ------------------------------ item 5 ------------------------------ */

test("no free months: zero instances of the early-member claim in any locale", () => {
  const claimPhrases = [
    "months of Pro free", "mois de Pro offerts", "meses de Pro gratis", "Monate Pro kostenlos",
    "חודשי Pro", "mwa Pro gratis", "mesi di Pro", "miesiące Pro", "meses de Pro gratuitos",
    "месяца Pro", "ay Pro ücretsiz", "місяці Pro", "أشهر من Pro",
    "locked for life", "bloqué à vie", "bloqueado de por vida", "lebenslang fixiert",
    "נעולים לכל החיים", "bloke pou lavi", "bloccato a vita", "zamrożona na zawsze",
    "travado para sempre", "зафиксирована навсегда", "ömür boyu kilitli", "зафіксована назавжди",
    "مقفلة مدى الحياة",
  ];
  for (const meta of LOCALES) {
    const dict = getDictionary(meta.code);
    const pricingJson = JSON.stringify(dict.pricing) + JSON.stringify(dict.pricingPage.faq);
    for (const phrase of claimPhrases) {
      assert.ok(!pricingJson.includes(phrase), `${meta.code} pricing still carries: ${phrase}`);
    }
    assert.ok(
      !/early/i.test(dict.pricing.pro.point4) || meta.code !== "en",
      `${meta.code} Pro point4 keeps early-member wording`,
    );
    assert.ok(
      !dict.pricingPage.faq.items.early.q.toLowerCase().includes("early member"),
      `${meta.code} FAQ still asks the early-member question`,
    );
  }
  assert.equal(
    en.pricing.pro.point4,
    "$9.99/mo from the first month, card required at checkout.",
  );
  assert.equal(en.pricingPage.faq.items.early.q, "When does Pro billing start?");
  assert.ok(en.pricingPage.faq.items.early.a.includes("$9.99 for the first month"));
});

/* ------------------------------ item 7 copy ------------------------------ */

test("shops copy: the old 14-day / 25 promise is gone from every public surface", () => {
  const trialWords = /14\s(days|jours|días|Tage|giorni|dni|dias|дней|gün|днів|יום|jou)/;
  for (const meta of LOCALES) {
    const dict = getDictionary(meta.code);
    const surfaces = [
      dict.pricing.shops.point4,
      dict.shopsPage.plan.body,
      dict.shopsPage.faq.items.cost.a,
      dict.pricingPage.faq.items.business.a,
    ];
    for (const s of surfaces) {
      assert.ok(!trialWords.test(s), `${meta.code} still promises the old trial: ${s}`);
      assert.ok(!s.includes("25 diagnoses") && !s.includes("25 diagnostics"), `${meta.code}: ${s}`);
    }
  }
  assert.ok(en.shopsPage.plan.body.includes("Get started free, no card to start."));
  assert.ok(en.shopsPage.plan.body.includes("500 diagnosis credits a month"), "the settled bucket stays stated");
  assert.ok(
    en.shopsPage.plan.note.includes("doesn't guarantee"),
    "the honesty line (no guaranteed calls/jobs/revenue) is untouched",
  );
});

/* ------------------------------ items 3 + 6 ------------------------------ */

test("register honesty: no locale still promises 20 seconds", () => {
  for (const meta of LOCALES) {
    const dict = getDictionary(meta.code);
    assert.ok(
      !dict.auth.register.freeSub.includes("20"),
      `${meta.code} freeSub still carries the 20-second claim`,
    );
  }
  assert.equal(en.auth.register.freeSub, "5 free diagnoses. No card. Takes about a minute.");
});

test("single diagnosis: the no-subscription path reads unmistakably", () => {
  assert.equal(en.pricing.single.tagline, "One time. No subscription.");
  assert.equal(en.pricing.single.period, "One-time");
  assert.ok(
    en.wp6.billing.buyDiagnosisNote.startsWith("One-time $4, no subscription."),
    "the in-app buy-one note says it too",
  );
  const page = read("app/app/diagnose/page.tsx");
  assert.ok(
    page.includes("Buy one diagnosis for $4 — one-time, no subscription"),
    "the paywall fallback copy says one-time, no subscription",
  );
  for (const meta of LOCALES) {
    const dict = getDictionary(meta.code);
    assert.ok(dict.pricing.single.tagline.length > 0, `${meta.code} single tagline present`);
  }
});

/* ------------------------------ items 1 + 2 ------------------------------ */

test("button unity: fair price and the hero share one door", () => {
  const fair = read("components/HomeFairPrice.tsx");
  assert.ok(fair.includes('href="/app/diagnose"'));
  assert.ok(!fair.includes('href="/diagnose"'));
  const hero = read("components/Hero.tsx");
  assert.ok(hero.includes('href="/app/diagnose"'), "the hero button's door");
  const header = read("components/HomeHeader.tsx");
  assert.ok(header.includes('href="/register"'), "Try MECHA free stays the signup door");
});

test("logged-out diagnose door: register landing + return path saved", () => {
  const page = read("app/app/diagnose/page.tsx");
  assert.ok(page.includes("bounceToRegister"), "the bounce is the shared helper");
  assert.ok(
    page.includes('sessionStorage.setItem(RETURN_TO_KEY, "/app/diagnose")'),
    "the diagnose intent is saved before the bounce",
  );
  assert.ok(page.includes('window.location.href = "/register"'), "the bounce lands on register");
  const register = read("app/register/page.tsx");
  assert.ok(register.includes("RETURN_TO_KEY"), "register honors the return path first");
  assert.ok(register.includes("t.auth.register.freeSub"), "register explains the free offer");
  const login = read("app/login/page.tsx");
  assert.ok(login.includes("RETURN_TO_KEY"), "login honors it too (returning user via the sign-in link)");
});

/* ------------------------------ item 7b ------------------------------ */

test("upgrade now: the owner's label at the limit and in billing", () => {
  assert.equal(en.wp6.billing.upgradeNow, "Upgrade now");
  const page = read("app/app/diagnose/page.tsx");
  assert.ok(page.includes("t.wp6.billing.upgradeNow"), "the paywall button carries the label");
  assert.ok(page.includes('buyDoor("business")'), "the button uses the existing shops checkout flow");
  const billing = read("components/BillingSection.tsx");
  assert.ok(billing.includes("label: b.upgradeNow"), "the dashboard upgrade card carries it too");
  assert.ok(billing.includes("b.freeLine") && billing.includes("b.freeEndedLine"), "the free20 shelf rows render");
  for (const meta of LOCALES) {
    const dict = getDictionary(meta.code);
    assert.ok(dict.wp6.billing.upgradeNow.length > 0, `${meta.code} upgradeNow resolves`);
    assert.ok(dict.wp6.billing.freeLine.includes("{remaining}"), `${meta.code} freeLine carries the count`);
  }
});

/* ------------------------------ item 9 ------------------------------ */

test("shop diagnose panel: three doors wired to the real endpoints", () => {
  const panel = read("app/app/diagnose/ShopDiagnoseDoors.tsx");
  assert.ok(panel.includes('"/api/vin/decode"'), "door 1 decodes through the NHTSA route");
  assert.ok(panel.includes('"/api/codes/lookup"'), "door 3 looks codes up in the catalog");
  assert.ok(panel.includes("d.vinTitle") && panel.includes("d.manualTitle") && panel.includes("d.codeTitle"), "the owner's three options");
  assert.ok(panel.includes("d.engineLabel") && panel.includes("d.mileageLabel"), "the manual door carries the fields the diagnosis needs");
  const page = read("app/app/diagnose/page.tsx");
  assert.ok(page.includes("<ShopDiagnoseDoors"), "the panel renders on the diagnose page");
  assert.ok(page.includes("isShop &&"), "the panel is the shop entry — drivers keep their own doors");
  const vinRoute = read("app/api/vin/decode/route.ts");
  assert.ok(vinRoute.includes('["driver", "shop"]'), "the VIN route admits shops");
  const lookupRoute = read("app/api/codes/lookup/route.ts");
  assert.ok(lookupRoute.includes("faultCodePage"), "the lookup serves the public catalog");
  assert.equal(en.wp6.diagnoseDoors.vinTitle, "Enter the VIN to add the vehicle");
  assert.equal(en.wp6.diagnoseDoors.codeTitle, "Search a code");
});

test("code lookup facts: catalogued, uncatalogued, and malformed codes", () => {
  const known = faultCodePage("P0420");
  assert.ok(known, "P0420 carries a full catalog page");
  assert.ok(known.title.length > 0 && known.plain.length > 0);
  const structure = codeStructure("P0420");
  assert.equal(structure?.system, "Powertrain");
  assert.equal(faultCodePage("P0999"), null, "a valid but uncatalogued code has no page");
  assert.ok(codeStructure("P0999"), "…but its structure still reads");
  assert.equal(codeStructure("banana"), null, "a malformed code is refused");
});
