"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Dashboard contract — design pass #8 (2026-11-16, owner verdict
 * on the pass #3 bare/borderless rebuild: "I don't like this
 * dashboard at all at all"). The dashboard is PROFESSIONAL and
 * STRUCTURED: clean white cards with clear headings in the
 * pass #7 light/blue theme —
 *
 *   - a vehicle summary card (the in-use film, the vehicle's
 *     name, the specs already on file, a clear Health Vault
 *     action; the no-vehicle state is the same card with the
 *     add-a-vehicle action, never a bare floating element);
 *   - a diagnoses card: the free count labeled and in context
 *     ("N of 5 free diagnoses left"), a clean meter, the
 *     what-happens-at-zero sentence, and the upgrade path to
 *     the billing card — NOT a giant bare numeral in open space;
 *   - quick actions as labeled cards (icon, title, one-line
 *     description), same six destinations as always;
 *   - recent diagnoses as a tidy divided list card, with an
 *     actionable empty state;
 *   - the business profile as a card; plan & billing as a card
 *     (tests/pricing.test.ts pins its price presentation).
 *
 * Presentation only: every data source, count, link, and flow
 * is the one the dashboard has always had.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const root = process.cwd();
const read = (rel) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, rel), "utf8");
const page = read("app/app/page.tsx");
(0, node_test_1.test)("dashboard structure: sections are structured cards with headings, not bare floating elements", () => {
    strict_1.default.ok(page.includes("rounded-2xl border border-line bg-surface"), "the card shell (white card, hairline border) carries the sections");
    strict_1.default.ok(page.includes("CardHeading"), "sections carry clear card headings");
    // The pass #3 signatures are gone: no giant bare numeral, no
    // borderless icon-over-label action row.
    strict_1.default.ok(!page.includes("text-8xl"), "the giant bare diagnosis numeral is gone");
    strict_1.default.ok(!page.includes("text-6xl font-medium leading-none"), "no other bare display numeral stands in for the meter");
});
(0, node_test_1.test)("dashboard data: the same sources and flows as always", () => {
    for (const src of ["/api/auth/me", "/api/vehicles", "/api/diagnoses/recent", "/api/business/me"]) {
        strict_1.default.ok(page.includes(src), `dashboard still reads ${src}`);
    }
    for (const href of ["/app/diagnose", "/app/nearby?kind=shops", "/app/nearby?kind=towing", "/marketplace", "/sell", "/app/vault", "/app/messages", "/app/nearby"]) {
        strict_1.default.ok(page.includes(`"${href}"`), `dashboard still links ${href}`);
    }
    // The sign-in fix (2026-11-16): the dashboard never sends a
    // signed-in user to the complete-profile wall — the phone card
    // below collects the number in place instead.
    strict_1.default.ok(!page.includes('"/app/complete-profile"'), "no link or route to the old phone wall");
    // The verify-email flow is intact (code entry + resend).
    strict_1.default.ok(page.includes("/api/auth/verify-email"), "verify flow intact");
    strict_1.default.ok(page.includes("/api/auth/resend-verification"), "resend flow intact");
});
(0, node_test_1.test)("vehicle card: film, name, the specs on file, and the Health Vault action", () => {
    strict_1.default.ok(page.includes('<LoopClip name="roadside" />'), "the in-use film heads the vehicle card");
    strict_1.default.ok(page.includes("d.viewVault"), "the card's clear action is Open the Health Vault");
    // Key specs come from the vehicle record the API already
    // returns — trim, engine, mileage, color, labeled from the
    // vault catalog.
    for (const field of ["heroVehicle.trim", "heroVehicle.engine", "heroVehicle.mileage", "heroVehicle.color"]) {
        strict_1.default.ok(page.includes(field), `vehicle card presents ${field} when on file`);
    }
    for (const label of ["t.wp6.vault.trim", "t.wp6.vault.engine", "t.wp6.vault.mileage", "t.wp6.vault.color"]) {
        strict_1.default.ok(page.includes(label), `spec label comes from the catalog: ${label}`);
    }
    // No-vehicle state: the same card, the honest sentence, the
    // add action — gated on the first load so it never flashes.
    strict_1.default.ok(page.includes("d.noVehicles"), "no-vehicle state states it plainly");
    strict_1.default.ok(page.includes("d.addVehicle"), "no-vehicle state offers Add a vehicle");
    strict_1.default.ok(page.includes("driverLoaded"), "the no-vehicle action waits for the first load");
});
(0, node_test_1.test)("diagnoses card: labeled count in context, clean meter, what happens at zero, upgrade path", () => {
    strict_1.default.ok(page.includes("d.quotaTitle"), "the card is headed (Diagnoses)");
    strict_1.default.ok(page.includes("d.quotaOf") && page.includes("d.quotaLeft"), "the count is stated as a sentence — N of 5 free diagnoses left");
    strict_1.default.ok(page.includes("quota.remaining"), "the remaining count is the server-stated one");
    strict_1.default.ok(page.includes("bg-inset") && page.includes("bg-accent"), "a clean meter bar, filled with the accent");
    strict_1.default.ok(page.includes("d.quotaNote"), "the card states what happens when the free diagnoses run out");
    strict_1.default.ok(page.includes("d.quotaUpgrade"), "the card offers the upgrade");
    strict_1.default.ok(page.includes('href="#billing"'), "the upgrade path lands on the plan & billing card");
    strict_1.default.ok(page.includes("d.quotaPro"), "Pro still reads as one clear line — unlimited diagnoses");
});
(0, node_test_1.test)("quick actions: labeled cards — icon, title, one-line description — same six destinations", () => {
    for (const sub of [
        "d.actionDiagnoseSub",
        "d.actionShopSub",
        "d.actionTowSub",
        "d.actionMarketplaceSub",
        "d.actionSellSub",
        "d.actionVaultSub",
    ]) {
        strict_1.default.ok(page.includes(sub), `action card carries its one-line description: ${sub}`);
    }
    strict_1.default.ok(page.includes("rounded-2xl border border-line bg-surface p-5"), "actions are proper cards");
    strict_1.default.ok(page.includes("hover:border-accent"), "action cards answer the hover with the accent");
});
(0, node_test_1.test)("recent diagnoses: a tidy divided list, or an empty state with one action", () => {
    strict_1.default.ok(page.includes("d.recentDiagnoses"), "the section is headed");
    strict_1.default.ok(page.includes("divide-y divide-line"), "diagnoses render as a divided list");
    strict_1.default.ok(page.includes("diag.aiResult?.severity"), "each row keeps its date + severity line");
    strict_1.default.ok(page.includes("diag.problemText"), "each row keeps its problem text");
    strict_1.default.ok(page.includes("d.noDiagnoses"), "the empty state is stated");
    strict_1.default.ok(page.includes('href="/app/diagnose"'), "the empty state offers the diagnosis action");
});
(0, node_test_1.test)("account prompts are cards too: phone completion and email verification", () => {
    strict_1.default.ok(page.includes("d.verifyTitle"), "verify prompt keeps its heading");
    strict_1.default.ok(page.includes("d.verifyButton") && page.includes("d.verifyResend"), "verify prompt keeps its actions");
});
(0, node_test_1.test)("phone card: non-blocking, in place, dismissible — shown only when the number is missing", () => {
    // Shown only for a driver with no phone on file, and only
    // until dismissed — never for accounts that have a number.
    strict_1.default.ok(page.includes("phoneMissing && !phoneDismissed"), "the card gates on missing phone + not dismissed");
    strict_1.default.ok(page.includes("setPhoneMissing(me.data.user.phone === null)"), "missing state comes from the account record");
    strict_1.default.ok(page.includes("t.auth.completeProfile.bannerTitle"), "the card keeps its heading");
    strict_1.default.ok(page.includes("t.auth.completeProfile.bannerBody"), "the card states why the number matters");
    // Completable IN PLACE: the same save endpoint + session
    // refresh the complete-profile page uses; success hides it.
    strict_1.default.ok(page.includes('"/api/auth/complete-phone"'), "the card saves through the complete-phone endpoint");
    strict_1.default.ok(page.includes("saveSession(res.data.token, res.data.user)"), "a successful save refreshes the session");
    strict_1.default.ok(page.includes("setPhoneMissing(false)"), "a successful save retires the card");
    strict_1.default.ok(page.includes("t.auth.completeProfile.phoneLabel"), "the input is labeled from the catalog");
    strict_1.default.ok(page.includes("t.auth.completeProfile.bannerCta"), "the save action is the catalog's");
    strict_1.default.ok(page.includes("t.auth.completeProfile.failed"), "save failures surface the honest copy");
    // Dismissible: a "Not now" control hides the card.
    strict_1.default.ok(page.includes("t.auth.completeProfile.bannerDismiss"), "the card offers the dismiss");
    strict_1.default.ok(page.includes("setPhoneDismissed(true)"), "the dismiss hides the card");
});
(0, node_test_1.test)("business view: profile card + billing, same data", () => {
    strict_1.default.ok(page.includes("d.businessProfile"), "the profile card is headed");
    for (const key of ["d.businessPlan", "t.wp6.business.phone", "t.wp6.business.zip"]) {
        strict_1.default.ok(page.includes(key), `profile row kept: ${key}`);
    }
    strict_1.default.ok(page.includes("d.businessMessages"), "the messages action is kept");
    strict_1.default.ok(page.includes('<BillingSection kind="business"'), "business billing renders");
    strict_1.default.ok(page.includes('<BillingSection kind="driver"'), "driver billing renders");
});
