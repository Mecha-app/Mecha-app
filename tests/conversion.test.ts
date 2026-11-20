/**
 * Conversion pass contract (2026-11-20, owner-approved audit of
 * mechatech.io — "fix everything"): the audit's three changes,
 * adapted to the settled facts.
 *
 *   1. Homepage: ONE filled hero button, the outcome headline,
 *      the sample report demoted to a text link, the microcopy
 *      line, Pricing + For Shops in the home nav, the language
 *      button reading as one word ("English", never "Englishen"),
 *      and no Marketplace section on the homepage body.
 *   2. /pricing: the one-problem line, a real Single Diagnosis
 *      block wired to the existing single-credit checkout, the
 *      Pro subhead + "Start Pro" with plan intent that survives
 *      signup, and the owner's 14-day guarantee wording.
 *   3. /terms Billing section; /register's free-account copy and
 *      the code-flow note under Continue; the diagnose screen's
 *      example placeholders and "Get my diagnosis".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import en from "../lib/i18n/dictionaries/en";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("language switcher: the button is ONE label span — no glued code word", () => {
  const s = read("components/LanguageSwitcher.tsx");
  assert.ok(s.includes("{current?.label}"), "the button shows the locale's own name");
  assert.ok(!s.includes("sm:hidden uppercase"), "the breakpoint-toggled code span is gone");
  assert.ok(!s.includes("Englishen"), "no glued label anywhere");
});

test("catalog: the audit's exact EN copy is what ships", () => {
  assert.equal(
    en.hero.copilotTitle,
    "Know what's wrong with your car — and what the repair should cost.",
  );
  assert.equal(en.hero.startFreeCta, "Diagnose my car free");
  assert.equal(en.hero.demoCta, "See a sample report first");
  assert.ok(en.hero.sub.includes("5 free diagnoses, no card"), "supporting copy carries the free truth");
  assert.ok(en.hero.microcopy.includes("No card required"), "microcopy states the no-card truth");
  assert.ok(en.hero.microcopy.includes("not a substitute for a certified mechanic"), "microcopy keeps the honest limit");
  assert.equal(en.pricing.singleLine, "Just one problem? Start free — your first 5 diagnoses cost nothing.");
  assert.equal(en.pricing.single.price, "$4");
  assert.equal(en.pricing.single.tagline, "One time. No subscription.");
  assert.equal(en.pricing.single.cta, "Buy one diagnosis");
  assert.equal(en.pricing.pro.cta, "Start Pro");
  assert.equal(en.pricing.pro.period, "Per month, cancel anytime");
  assert.ok(en.pricing.pro.sub.includes("small fleet"), "the Pro subhead names who Pro is for");
  assert.ok(
    en.pricing.pro.point4.includes("Card required at checkout."),
    "the early-member line states the card truth (the Pro checkout collects a card; no trial exists in code)",
  );
  assert.equal(en.auth.register.headline, "Create your free account");
  assert.equal(en.auth.register.freeSub, "5 free diagnoses. No card. Takes about 20 seconds.");
});

test("plan cards: single block + plan intent are wired to the real flows", () => {
  const cards = read("components/PlanCards.tsx");
  // The one-problem line + the single block render on the full variant.
  assert.ok(cards.includes("p.singleLine"), "the one-problem line renders from the catalog");
  assert.ok(cards.includes("p.single.tagline") && cards.includes("p.single.cta"), "the single block is catalog copy");
  // Signed-in: the SAME single-credit checkout the billing card runs.
  assert.ok(cards.includes('"/api/payments/create-checkout"'), "single purchase uses the existing checkout route");
  assert.ok(cards.includes('plan: "credit"'), "single purchase is the credit plan");
  // Signed-out: register with the plan in the URL + the intent saved.
  assert.ok(cards.includes('"/register?plan=single"'), "signed-out single goes to register with the plan");
  assert.ok(cards.includes('"/register?plan=pro"'), "signed-out Pro goes to register with the plan");
  assert.ok(cards.includes('savePlanIntent("pro")') && cards.includes('savePlanIntent("single")'), "both CTAs save the intent");
  assert.ok(cards.includes('"/app#billing"'), "signed-in Pro lands on the billing card");
  // No price literal restated in the component.
  assert.ok(!cards.includes('"$4"') && !cards.includes("$4.00"), "the single price comes from the catalog only");
});

test("plan intent: survives every sign-in door and highlights on the billing card", () => {
  const helper = read("lib/client/planIntent.ts");
  assert.ok(helper.includes("mecha-plan-intent"), "the intent lives under one storage key");
  assert.ok(helper.includes('"/app#billing"'), "the intent destination is the billing card");
  for (const door of ["app/register/page.tsx", "app/login/page.tsx"]) {
    const src = read(door);
    assert.ok(src.includes("planIntentDestination()"), `${door} honors the plan intent`);
    assert.ok(src.includes("capturePlanIntentFromUrl()"), `${door} captures the ?plan= query`);
  }
  const google = read("app/auth/google/complete/page.tsx");
  assert.ok(google.includes("planIntentDestination()"), "the Google door honors the plan intent");
  const billing = read("components/BillingSection.tsx");
  assert.ok(billing.includes("readPlanIntent()") && billing.includes("clearPlanIntent()"), "billing reads + clears the intent");
  assert.ok(billing.includes('intent === "pro"') && billing.includes('intent === "single"'), "billing highlights the chosen card");
});

test("register: free-account copy + the code-flow note under Continue", () => {
  const page = read("app/register/page.tsx");
  assert.ok(page.includes("t.auth.register.headline"), "the headline is Create your free account");
  assert.ok(page.includes("t.auth.register.freeSub"), "the supporting copy renders under the headline");
  const door = read("components/EmailCodeAuth.tsx");
  assert.ok(door.includes("t.auth.code.registerIntro"), "the register door states the code flow under Continue");
  assert.ok(door.includes('mode === "register"'), "the note is register-only — the login door is untouched");
});

test("terms: the Billing section states the settled facts", () => {
  const terms = read("app/terms/page.tsx");
  assert.ok(terms.includes("9. Billing"), "the Billing section exists");
  assert.ok(terms.includes("$9.99 per month") && terms.includes("renews monthly until you cancel"), "Pro price + renewal");
  assert.ok(terms.includes("cancel anytime from Billing in your dashboard"), "cancel path");
  assert.ok(terms.includes("end of the paid period"), "access runs to the period end");
  assert.ok(terms.includes("do not roll over"), "monthly credits do not roll over");
  assert.ok(terms.includes("one-time $4 charge"), "the single diagnosis is a one-time charge");
  assert.ok(terms.includes("within 14 days"), "the 14-day guarantee matches /pricing");
});

test("diagnose screen: example placeholders + Get my diagnosis", () => {
  const page = read("app/app/diagnose/page.tsx");
  assert.ok(page.includes("e.g. 2018 Honda Accord, 84,000 miles"), "the car field shows a real example");
  assert.ok(
    page.includes("e.g. Orange check-engine light, rough idle when cold, started yesterday"),
    "the problem field shows a real example",
  );
  assert.ok(page.includes("Get my diagnosis"), "the primary button is Get my diagnosis");
  assert.ok(!page.includes('"Run diagnosis"'), "the old button label is gone");
});
