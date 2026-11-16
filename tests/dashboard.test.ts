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
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const page = read("app/app/page.tsx");

test("dashboard structure: sections are structured cards with headings, not bare floating elements", () => {
  assert.ok(
    page.includes("rounded-2xl border border-line bg-surface"),
    "the card shell (white card, hairline border) carries the sections",
  );
  assert.ok(page.includes("CardHeading"), "sections carry clear card headings");
  // The pass #3 signatures are gone: no giant bare numeral, no
  // borderless icon-over-label action row.
  assert.ok(!page.includes("text-8xl"), "the giant bare diagnosis numeral is gone");
  assert.ok(!page.includes("text-6xl font-medium leading-none"), "no other bare display numeral stands in for the meter");
});

test("dashboard data: the same sources and flows as always", () => {
  for (const src of ["/api/auth/me", "/api/vehicles", "/api/diagnoses/recent", "/api/business/me"]) {
    assert.ok(page.includes(src), `dashboard still reads ${src}`);
  }
  for (const href of ["/app/diagnose", "/app/nearby?kind=shops", "/app/nearby?kind=towing", "/marketplace", "/sell", "/app/vault", "/app/messages", "/app/nearby"]) {
    assert.ok(page.includes(`"${href}"`), `dashboard still links ${href}`);
  }
  // The sign-in fix (2026-11-16): the dashboard never sends a
  // signed-in user to the complete-profile wall — the phone card
  // below collects the number in place instead.
  assert.ok(!page.includes('"/app/complete-profile"'), "no link or route to the old phone wall");
  // The verify-email flow is intact (code entry + resend).
  assert.ok(page.includes("/api/auth/verify-email"), "verify flow intact");
  assert.ok(page.includes("/api/auth/resend-verification"), "resend flow intact");
});

test("vehicle card: film, name, the specs on file, and the Health Vault action", () => {
  assert.ok(page.includes('<LoopClip name="roadside" />'), "the in-use film heads the vehicle card");
  assert.ok(page.includes("d.viewVault"), "the card's clear action is Open the Health Vault");
  // Key specs come from the vehicle record the API already
  // returns — trim, engine, mileage, color, labeled from the
  // vault catalog.
  for (const field of ["heroVehicle.trim", "heroVehicle.engine", "heroVehicle.mileage", "heroVehicle.color"]) {
    assert.ok(page.includes(field), `vehicle card presents ${field} when on file`);
  }
  for (const label of ["t.wp6.vault.trim", "t.wp6.vault.engine", "t.wp6.vault.mileage", "t.wp6.vault.color"]) {
    assert.ok(page.includes(label), `spec label comes from the catalog: ${label}`);
  }
  // No-vehicle state: the same card, the honest sentence, the
  // add action — gated on the first load so it never flashes.
  assert.ok(page.includes("d.noVehicles"), "no-vehicle state states it plainly");
  assert.ok(page.includes("d.addVehicle"), "no-vehicle state offers Add a vehicle");
  assert.ok(page.includes("driverLoaded"), "the no-vehicle action waits for the first load");
});

test("diagnoses card: labeled count in context, clean meter, what happens at zero, upgrade path", () => {
  assert.ok(page.includes("d.quotaTitle"), "the card is headed (Diagnoses)");
  assert.ok(
    page.includes("d.quotaOf") && page.includes("d.quotaLeft"),
    "the count is stated as a sentence — N of 5 free diagnoses left",
  );
  assert.ok(page.includes("quota.remaining"), "the remaining count is the server-stated one");
  assert.ok(page.includes("bg-inset") && page.includes("bg-accent"), "a clean meter bar, filled with the accent");
  assert.ok(page.includes("d.quotaNote"), "the card states what happens when the free diagnoses run out");
  assert.ok(page.includes("d.quotaUpgrade"), "the card offers the upgrade");
  assert.ok(page.includes('href="#billing"'), "the upgrade path lands on the plan & billing card");
  assert.ok(page.includes("d.quotaPro"), "Pro still reads as one clear line — unlimited diagnoses");
});

test("quick actions: labeled cards — icon, title, one-line description — same six destinations", () => {
  for (const sub of [
    "d.actionDiagnoseSub",
    "d.actionShopSub",
    "d.actionTowSub",
    "d.actionMarketplaceSub",
    "d.actionSellSub",
    "d.actionVaultSub",
  ]) {
    assert.ok(page.includes(sub), `action card carries its one-line description: ${sub}`);
  }
  assert.ok(page.includes("rounded-2xl border border-line bg-surface p-5"), "actions are proper cards");
  assert.ok(page.includes("hover:border-accent"), "action cards answer the hover with the accent");
});

test("recent diagnoses: a tidy divided list, or an empty state with one action", () => {
  assert.ok(page.includes("d.recentDiagnoses"), "the section is headed");
  assert.ok(page.includes("divide-y divide-line"), "diagnoses render as a divided list");
  assert.ok(page.includes("diag.aiResult?.severity"), "each row keeps its date + severity line");
  assert.ok(page.includes("diag.problemText"), "each row keeps its problem text");
  assert.ok(page.includes("d.noDiagnoses"), "the empty state is stated");
  assert.ok(page.includes('href="/app/diagnose"'), "the empty state offers the diagnosis action");
});

test("account prompts are cards too: phone completion and email verification", () => {
  assert.ok(page.includes("d.verifyTitle"), "verify prompt keeps its heading");
  assert.ok(page.includes("d.verifyButton") && page.includes("d.verifyResend"), "verify prompt keeps its actions");
});

test("phone card: non-blocking, in place, dismissible — shown only when the number is missing", () => {
  // Shown only for a driver with no phone on file, and only
  // until dismissed — never for accounts that have a number.
  assert.ok(page.includes("phoneMissing && !phoneDismissed"), "the card gates on missing phone + not dismissed");
  assert.ok(page.includes("setPhoneMissing(me.data.user.phone === null)"), "missing state comes from the account record");
  assert.ok(page.includes("t.auth.completeProfile.bannerTitle"), "the card keeps its heading");
  assert.ok(page.includes("t.auth.completeProfile.bannerBody"), "the card states why the number matters");
  // Completable IN PLACE: the same save endpoint + session
  // refresh the complete-profile page uses; success hides it.
  assert.ok(page.includes('"/api/auth/complete-phone"'), "the card saves through the complete-phone endpoint");
  assert.ok(page.includes("saveSession(res.data.token, res.data.user)"), "a successful save refreshes the session");
  assert.ok(page.includes("setPhoneMissing(false)"), "a successful save retires the card");
  assert.ok(page.includes("t.auth.completeProfile.phoneLabel"), "the input is labeled from the catalog");
  assert.ok(page.includes("t.auth.completeProfile.bannerCta"), "the save action is the catalog's");
  assert.ok(page.includes("t.auth.completeProfile.failed"), "save failures surface the honest copy");
  // Dismissible: a "Not now" control hides the card.
  assert.ok(page.includes("t.auth.completeProfile.bannerDismiss"), "the card offers the dismiss");
  assert.ok(page.includes("setPhoneDismissed(true)"), "the dismiss hides the card");
});

test("business view: profile card + billing, same data", () => {
  assert.ok(page.includes("d.businessProfile"), "the profile card is headed");
  for (const key of ["d.businessPlan", "t.wp6.business.phone", "t.wp6.business.zip"]) {
    assert.ok(page.includes(key), `profile row kept: ${key}`);
  }
  assert.ok(page.includes("d.businessMessages"), "the messages action is kept");
  assert.ok(page.includes('<BillingSection kind="business"'), "business billing renders");
  assert.ok(page.includes('<BillingSection kind="driver"'), "driver billing renders");
});
