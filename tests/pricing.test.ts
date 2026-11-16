/**
 * Pricing presentation contract — design pass #8 (2026-11-16,
 * owner: "the prices, the way they presented, they not
 * professional — it needs to be changed"). ONE professional
 * system everywhere a price appears:
 *
 *   - components/PlanCards.tsx is the single card system: plan
 *     name, the price large with its period, a checkmark list
 *     of what's included (the catalog's own points — true
 *     features only), one clear CTA per card. Pro is the
 *     highlighted card (blue border + the "Most popular"
 *     badge); Shops is the business card.
 *   - /pricing renders the full variant (components/Pricing).
 *   - The homepage strip renders the compact variant
 *     (tests/homepage.test.ts pins the strip itself).
 *   - The dashboard's Plan & billing card presents the current
 *     plan's price with the same typography, from the same
 *     catalog strings.
 *
 * Every price string is reused from the pricing catalog — no
 * surface restates a price, so no surface can drift.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const cards = read("components/PlanCards.tsx");

test("plan cards: the three real plans, every string from the pricing catalog", () => {
  for (const tier of ["free", "pro", "shops"]) {
    for (const field of ["name", "price", "period", "point1", "point2", "point3", "point4", "cta"]) {
      assert.ok(cards.includes(`p.${tier}.${field}`), `card copy is the catalog's: pricing.${tier}.${field}`);
    }
  }
  // Reused, never restated: no price literal lives in the cards,
  // the pricing section, or the strip.
  for (const file of ["components/PlanCards.tsx", "components/Pricing.tsx", "components/HomePlans.tsx"]) {
    const src = read(file);
    assert.ok(!src.includes("$9.99") && !src.includes("$149"), `no hardcoded prices in ${file}`);
  }
});

test("plan cards: professional card format — price large, checkmark list, one CTA per card", () => {
  assert.ok(cards.includes("rounded-2xl border border-line bg-surface"), "cards are white cards on a hairline border");
  assert.ok(cards.includes("text-5xl font-semibold"), "the price is large and clear");
  assert.ok(cards.includes("M4 12.5l5 5L20 6.5"), "the included list is a checkmark list");
  assert.ok(cards.includes('href: "/register"') || cards.includes('"/register"'), "driver CTAs go to register");
  assert.ok(cards.includes("/business/register"), "the Shops CTA goes to business register");
  // Pro is the highlighted card: blue border + the popular badge.
  assert.ok(cards.includes("border-2 border-accent"), "the Pro card carries the blue highlight border");
  assert.ok(cards.includes("p.popularBadge"), "the Pro card is badged from the catalog (Most popular)");
  assert.ok(cards.includes("p.shops.badge"), "the Shops card keeps its business badge");
  // Full vs compact: full shows every point + the CTAs; compact
  // shows the headline point (the strip's button does the rest).
  assert.ok(cards.includes('variant === "compact"'), "the compact variant exists for the homepage strip");
  assert.ok(cards.includes('variant === "full"'), "CTAs render on the full variant");
});

test("/pricing renders the shared cards under its heading", () => {
  const pricing = read("components/Pricing.tsx");
  assert.ok(pricing.includes("<PlanCards"), "/pricing renders PlanCards");
  assert.ok(pricing.includes('variant="full"'), "/pricing uses the full variant");
  assert.ok(pricing.includes("p.eyebrow") && pricing.includes("p.heading"), "the page heading is kept");
  assert.ok(!pricing.includes("border-t border-line pt-9"), "the old hairline columns are gone");
});

test("billing card: the current plan's price, presented from the same catalog", () => {
  const billing = read("components/BillingSection.tsx");
  assert.ok(billing.includes('id="billing"'), "the billing card is the dashboard's #billing anchor");
  assert.ok(
    billing.includes("rounded-2xl border border-line bg-surface"),
    "billing renders as a structured card",
  );
  for (const key of ["t.pricing.pro.price", "t.pricing.pro.period", "t.pricing.shops.price", "t.pricing.shops.period", "t.pricing.free.price", "t.pricing.free.period"]) {
    assert.ok(billing.includes(key), `billing price comes from the catalog: ${key}`);
  }
  assert.ok(!billing.includes("$9.99") && !billing.includes("$149"), "billing restates no price literal of its own");
  // Flows unchanged: status read, portal for subscribers,
  // checkout for free accounts.
  assert.ok(billing.includes("/api/payments/status"), "status read intact");
  assert.ok(billing.includes("/api/payments/portal"), "portal flow intact");
  assert.ok(billing.includes("/api/payments/create-checkout"), "checkout flow intact");
  assert.ok(billing.includes("b.manageButton"), "the one clear manage action is kept");
});
