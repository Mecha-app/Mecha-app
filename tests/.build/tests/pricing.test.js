"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const root = process.cwd();
const read = (rel) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, rel), "utf8");
const cards = read("components/PlanCards.tsx");
(0, node_test_1.test)("plan cards: the three real plans, every string from the pricing catalog", () => {
    for (const tier of ["free", "pro", "shops"]) {
        for (const field of ["name", "price", "period", "point1", "point2", "point3", "point4", "cta"]) {
            strict_1.default.ok(cards.includes(`p.${tier}.${field}`), `card copy is the catalog's: pricing.${tier}.${field}`);
        }
    }
    // Reused, never restated: no price literal lives in the cards,
    // the pricing section, or the strip.
    for (const file of ["components/PlanCards.tsx", "components/Pricing.tsx", "components/HomePlans.tsx"]) {
        const src = read(file);
        strict_1.default.ok(!src.includes("$9.99") && !src.includes("$149"), `no hardcoded prices in ${file}`);
    }
});
(0, node_test_1.test)("plan cards: professional card format — price large, checkmark list, one CTA per card", () => {
    strict_1.default.ok(cards.includes("rounded-2xl border border-line bg-surface"), "cards are white cards on a hairline border");
    strict_1.default.ok(cards.includes("text-5xl font-semibold"), "the price is large and clear");
    strict_1.default.ok(cards.includes("M4 12.5l5 5L20 6.5"), "the included list is a checkmark list");
    strict_1.default.ok(cards.includes('href: "/register"') || cards.includes('"/register"'), "driver CTAs go to register");
    strict_1.default.ok(cards.includes("/business/register"), "the Shops CTA goes to business register");
    // Pro is the highlighted card: blue border + the popular badge.
    strict_1.default.ok(cards.includes("border-2 border-accent"), "the Pro card carries the blue highlight border");
    strict_1.default.ok(cards.includes("p.popularBadge"), "the Pro card is badged from the catalog (Most popular)");
    strict_1.default.ok(cards.includes("p.shops.badge"), "the Shops card keeps its business badge");
    // Full vs compact: full shows every point + the CTAs; compact
    // shows the headline point (the strip's button does the rest).
    strict_1.default.ok(cards.includes('variant === "compact"'), "the compact variant exists for the homepage strip");
    strict_1.default.ok(cards.includes('variant === "full"'), "CTAs render on the full variant");
});
(0, node_test_1.test)("/pricing renders the shared cards under its heading", () => {
    const pricing = read("components/Pricing.tsx");
    strict_1.default.ok(pricing.includes("<PlanCards"), "/pricing renders PlanCards");
    strict_1.default.ok(pricing.includes('variant="full"'), "/pricing uses the full variant");
    strict_1.default.ok(pricing.includes("p.eyebrow") && pricing.includes("p.heading"), "the page heading is kept");
    strict_1.default.ok(!pricing.includes("border-t border-line pt-9"), "the old hairline columns are gone");
});
(0, node_test_1.test)("billing card: the current plan's price, presented from the same catalog", () => {
    const billing = read("components/BillingSection.tsx");
    strict_1.default.ok(billing.includes('id="billing"'), "the billing card is the dashboard's #billing anchor");
    strict_1.default.ok(billing.includes("rounded-2xl border border-line bg-surface"), "billing renders as a structured card");
    for (const key of ["t.pricing.pro.price", "t.pricing.pro.period", "t.pricing.shops.price", "t.pricing.shops.period", "t.pricing.free.price", "t.pricing.free.period"]) {
        strict_1.default.ok(billing.includes(key), `billing price comes from the catalog: ${key}`);
    }
    strict_1.default.ok(!billing.includes("$9.99") && !billing.includes("$149"), "billing restates no price literal of its own");
    // Flows unchanged: status read, portal for subscribers,
    // checkout for free accounts.
    strict_1.default.ok(billing.includes("/api/payments/status"), "status read intact");
    strict_1.default.ok(billing.includes("/api/payments/portal"), "portal flow intact");
    strict_1.default.ok(billing.includes("/api/payments/create-checkout"), "checkout flow intact");
    strict_1.default.ok(billing.includes("b.manageButton"), "the one clear manage action is kept");
});
