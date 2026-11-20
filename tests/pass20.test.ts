/**
 * Pass #20 — the steal list (owner-approved 2026-11-17): the SEO
 * engine's datasets, the share card + outcome capture, the shop
 * script + severity headline derivations, maintenance math, the
 * compatibility rules, and the copy pins (guarantee + shops demand
 * framing). Everything here runs on templates, rules, and the
 * product's own data — zero live AI calls, by design.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiagnosisReport } from "../lib/server/ai";
import { MemoryAppStore } from "../lib/server/appStore";
import { compatForVehicle } from "../lib/server/compat";
import {
  buildShareCard,
  buildShopScript,
  driveVerdict,
  firstSentence,
} from "../lib/server/diagnosisExtras";
import {
  FAULT_CODE_PAGES,
  POPULAR_MODELS,
  codeStructure,
  faultCodePage,
  modelSlug,
  popularModelBySlug,
} from "../lib/server/faultCodes";
import { MAINTENANCE_ITEMS, maintenanceState } from "../lib/server/maintenance";
import { getMaintenance, recordServiceMark } from "../lib/server/maintenanceService";
import { faultCodeInfo, validateFaultCode } from "../lib/server/scan";
import {
  createShare,
  readOutcome,
  recordOutcome,
  resolveShareCard,
} from "../lib/server/shareService";
import { MemoryIdentityStore } from "../lib/server/store";
import en from "../lib/i18n/dictionaries/en";

const REPORT: DiagnosisReport = {
  severity: "Moderate — Fix Soon",
  safeToDriver: true,
  diagnosis:
    "The most likely cause is worn spark plugs breaking down under load, with one ignition coil a close second. The misfire appears above 3,000 rpm and clears at idle.",
  estimatedCost: { min: 180, max: 420 },
  laborHours: { min: 1, max: 1.5 },
  parts: [
    {
      name: "Spark plug set",
      likelihood: "likely",
      description: "Worn plugs misfire under load.",
    },
  ],
  steps: ["Have the codes read and note which cylinder misfires."],
  tip: "Ask for the old plugs back.",
  disclaimer: "AI-assisted information, not an inspection.",
};

// ---------------------------------------------------------------------
// 1. SEO engine — the fault-code dataset is real and consistent
// ---------------------------------------------------------------------

test("fault-code pages: every entry is a valid generic code whose structure matches the product's own logic", () => {
  assert.ok(FAULT_CODE_PAGES.length >= 10, "a real reference set, not a token page or two");
  const seen = new Set<string>();
  for (const entry of FAULT_CODE_PAGES) {
    assert.equal(validateFaultCode(entry.code), entry.code, `${entry.code} passes the product's validator`);
    const structure = codeStructure(entry.code);
    assert.ok(structure, `${entry.code} has a structure`);
    const info = faultCodeInfo(entry.code);
    assert.equal(structure.system, info.system, `${entry.code} system agrees with faultCodeInfo`);
    assert.equal(structure.scope, "generic", `${entry.code} is SAE generic — curated definitions cover generic codes only`);
    assert.ok(entry.title.length > 5 && entry.plain.length > 40, `${entry.code} carries real content`);
    assert.ok(entry.causes.length >= 3, `${entry.code} lists the standard first checks`);
    assert.ok(entry.driving.length > 20, `${entry.code} answers the driving question`);
    assert.ok(!seen.has(entry.code), `${entry.code} appears once`);
    seen.add(entry.code);
    // No invented statistics, no competitor names — anywhere.
    assert.ok(!/\d+\s*(%|percent)/i.test(entry.plain), `${entry.code} invents no percentages`);
    assert.ok(!/torquebot|aimech|fixd|carly|carmd/i.test(entry.plain + entry.title), `${entry.code} names no competitor`);
  }
  assert.equal(faultCodePage("p0300")?.code, "P0300", "lookup normalizes case");
  assert.equal(faultCodePage("P9999"), null, "an uncurated code gets no invented page");
});

test("popular models: slugs round-trip and every model is a real year/make/model triple", () => {
  assert.ok(POPULAR_MODELS.length >= 8);
  for (const model of POPULAR_MODELS) {
    assert.equal(model.slug, modelSlug(model.year, model.make, model.model), `${model.slug} is its canonical slug`);
    assert.equal(popularModelBySlug(model.slug)?.slug, model.slug);
    assert.ok(/^\d{4}$/.test(model.year));
  }
  assert.equal(popularModelBySlug("not-a-car"), null);
});

test("sitemap lists the SEO pages from the same dataset the pages render", () => {
  const src = readFileSync(join(process.cwd(), "app/sitemap.ts"), "utf8");
  assert.ok(src.includes("FAULT_CODE_PAGES"), "code pages come from the dataset");
  assert.ok(src.includes("POPULAR_MODELS"), "model pages come from the dataset");
  assert.ok(src.includes("/codes"), "the codes index is listed");
  assert.ok(src.includes("/check"), "the checker is listed");
});

// ---------------------------------------------------------------------
// 3 + 4. Shop script and severity headline — template derivations
// ---------------------------------------------------------------------

test("driveVerdict: the safety call wins over the severity label", () => {
  assert.equal(driveVerdict({ ...REPORT, safeToDriver: false, severity: "Minor — Monitor" }).band, "stop");
  assert.equal(driveVerdict({ ...REPORT, severity: "Critical" }).band, "stop");
  assert.equal(driveVerdict({ ...REPORT, severity: "Moderate — Fix Soon" }).band, "caution");
  assert.equal(driveVerdict({ ...REPORT, severity: "Minor — Monitor" }).band, "go");
  assert.match(driveVerdict({ ...REPORT, safeToDriver: false }).headline, /Do not drive/);
  assert.match(driveVerdict({ ...REPORT, severity: "Minor — Monitor" }).headline, /Safe to keep driving/);
});

test("shop script: plain counter sentences, fair-range language, no accusation words", () => {
  const lines = buildShopScript(REPORT, "2019 Honda Accord");
  assert.ok(lines.length >= 3 && lines.length <= 5, "a short script, readable at a counter");
  const text = lines.join(" ");
  assert.ok(text.includes("2019 Honda Accord"), "names the car");
  assert.ok(text.includes("spark plug set"), "names the lead fix from the report");
  assert.ok(text.includes("$180–$420"), "quotes the report's own fair range");
  assert.ok(text.includes("above the estimate range"), "uses the within/above-range language");
  assert.ok(text.includes("ask the shop to explain"), "asks for an explanation, not a fight");
  assert.ok(!/rip-?off|scam|steal/i.test(text), "never accuses the shop");
  // Without a cost estimate the script drops the range sentence entirely.
  const noCost = buildShopScript({ ...REPORT, estimatedCost: null }, null).join(" ");
  assert.ok(!noCost.includes("estimate range"), "no invented range when the report has none");
  // A stop verdict leads with the tow, not the repair talk.
  const stopped = buildShopScript({ ...REPORT, safeToDriver: false }, null).join(" ");
  assert.match(stopped, /should not be driven/);
});

test("firstSentence: takes the summary's lead, bounded", () => {
  assert.equal(firstSentence(REPORT.diagnosis), "The most likely cause is worn spark plugs breaking down under load, with one ignition coil a close second.");
  assert.equal(firstSentence(""), "");
  assert.ok(firstSentence("x".repeat(500)).length <= 241);
});

// ---------------------------------------------------------------------
// 2 + 9. Share cards and outcome capture — services over memory stores
// ---------------------------------------------------------------------

async function seededDiagnosis() {
  const store = new MemoryIdentityStore();
  const owner = await store.createUser({ name: "Owner", email: "owner@example.com" });
  const other = await store.createUser({ name: "Other", email: "other@example.com" });
  const saved = await store.saveDiagnosisRecord({
    userId: owner.id,
    vehicleId: null,
    vehicleInfo: "2019 Honda Accord",
    problemText: "Engine stumbles under load",
    aiResult: REPORT,
  });
  return { store, owner, other, diagnosisId: saved.id };
}

test("share service: mint, resolve, idempotent — and only the summary crosses", async () => {
  const { store, owner, diagnosisId } = await seededDiagnosis();
  const first = await createShare(store, owner.id, diagnosisId);
  assert.ok(first.token.length >= 32, "an unguessable token");
  const second = await createShare(store, owner.id, diagnosisId);
  assert.equal(second.token, first.token, "re-sharing returns the same link");

  const resolved = await resolveShareCard(store, first.token);
  assert.ok(resolved);
  assert.equal(resolved.card.vehicle, "2019 Honda Accord");
  assert.equal(resolved.card.headline, "Drive only if necessary");
  assert.equal(resolved.card.costLabel, "$180–$420");
  assert.deepEqual(resolved.card.partNames, ["Spark plug set"]);
  assert.ok(resolved.script.length >= 3, "the card carries the counter script");
  const cardJson = JSON.stringify(resolved);
  assert.ok(!cardJson.includes("owner@example.com"), "no account data on the card");
  assert.ok(!cardJson.includes(owner.id), "no user id on the card");
  assert.equal(await resolveShareCard(store, "x".repeat(40)), null, "unknown token resolves to nothing");
});

test("share + outcome: another user's diagnosis is indistinguishable from missing", async () => {
  const { store, other, diagnosisId } = await seededDiagnosis();
  await assert.rejects(() => createShare(store, other.id, diagnosisId), /not found/i);
  await assert.rejects(
    () => recordOutcome(store, other.id, diagnosisId, { whatFixed: "Plugs" }),
    /not found/i,
  );
});

test("outcome capture: validates, stores against the diagnosis, reads back", async () => {
  const { store, owner, diagnosisId } = await seededDiagnosis();
  assert.equal(await readOutcome(store, owner.id, diagnosisId), null);
  await assert.rejects(
    () => recordOutcome(store, owner.id, diagnosisId, { whatFixed: "  " }),
    /whatFixed/i,
  );
  await assert.rejects(
    () => recordOutcome(store, owner.id, diagnosisId, { whatFixed: "Plugs", costUsd: -5 }),
    /costUsd/i,
  );
  await assert.rejects(
    () => recordOutcome(store, owner.id, diagnosisId, { whatFixed: "Plugs", rating: 9 }),
    /rating/i,
  );
  const saved = await recordOutcome(store, owner.id, diagnosisId, {
    whatFixed: "New spark plugs and one coil",
    costUsd: 265.4,
  });
  assert.equal(saved.costUsd, 265, "cost stores as whole dollars");
  assert.equal(saved.rating, null, "rating is optional — absent stays null");
  assert.equal(saved.quotePermission, false, "quote permission defaults to NO");
  const rated = await recordOutcome(store, owner.id, diagnosisId, {
    whatFixed: "New spark plugs and one coil",
    costUsd: 265,
    rating: 5,
    quotePermission: true,
  });
  assert.equal(rated.rating, 5);
  assert.equal(rated.quotePermission, true, "permission is stored only when explicitly given");
  const back = await readOutcome(store, owner.id, diagnosisId);
  assert.equal(back?.whatFixed, "New spark plugs and one coil");
  assert.equal(back?.rating, 5);
});

// ---------------------------------------------------------------------
// 5. Maintenance — computed from user-entered data only
// ---------------------------------------------------------------------

test("maintenanceState: no mark means unknown — never a guess from total mileage", () => {
  const item = MAINTENANCE_ITEMS[0]; // oil change
  const state = maintenanceState(item, 240000, null, new Date("2026-11-17"));
  assert.equal(state.status, "unknown");
  assert.equal(state.milesLeft, null);
});

test("maintenanceState: due / soon / ok follow the entered mark and current mileage", () => {
  const item = MAINTENANCE_ITEMS[0];
  const now = new Date("2026-11-17");
  const mark = { item: item.key, lastMileage: 25000, lastDate: "2026-10-01" };
  const due = maintenanceState(item, 30500, mark, now);
  assert.equal(due.status, "due");
  assert.equal(due.milesLeft, -500);
  const ok = maintenanceState(item, 26000, mark, now);
  assert.equal(ok.status, "ok");
  assert.equal(ok.milesLeft, 4000);
  const soon = maintenanceState(item, 29500, mark, now);
  assert.equal(soon.status, "soon");
});

test("maintenance service: marks round-trip per vehicle, ownership enforced", async () => {
  const app = new MemoryAppStore();
  const vehicle = await app.createVehicle({
    ownerId: "driver-1",
    year: "2019",
    make: "Honda",
    model: "Accord",
    mileage: 30000,
  });
  const before = await getMaintenance(app, "driver-1", vehicle.id);
  assert.equal(before.states.length, MAINTENANCE_ITEMS.length);
  assert.ok(before.states.every((i) => i.status === "unknown"), "no marks yet — all unknown");
  await recordServiceMark(app, "driver-1", vehicle.id, {
    item: "oil",
    lastMileage: 25000,
    lastDate: "2026-10-01",
  });
  const after = await getMaintenance(app, "driver-1", vehicle.id);
  assert.equal(after.states.find((i) => i.item.key === "oil")?.status, "due");
  await assert.rejects(() => getMaintenance(app, "driver-2", vehicle.id), /not found/i);
  await assert.rejects(
    () => recordServiceMark(app, "driver-1", vehicle.id, { item: "fluxCapacitor" }),
    /must be one of/i,
  );
});

// ---------------------------------------------------------------------
// 7. Compatibility — the honest coverage rules
// ---------------------------------------------------------------------

test("compat: photo/symptom/fair-price apply to any car; VIN data starts at 1996", () => {
  const modern = compatForVehicle({ year: 2019 });
  assert.ok(modern.features.every((f) => f.applies), "a 2019 car gets everything");
  const classic = compatForVehicle({ year: 1990 });
  const byKey = Object.fromEntries(classic.features.map((f) => [f.key, f.applies]));
  assert.equal(byKey.vinData, false, "pre-1996: no NHTSA VIN/recall coverage — said plainly");
  assert.equal(byKey.diagnosis, true);
  assert.equal(byKey.photoScan, true);
  assert.equal(byKey.fairPrice, true);
  assert.equal(compatForVehicle({ year: 1996 }).features.find((f) => f.key === "vinData")?.applies, true);
});

// ---------------------------------------------------------------------
// 6 + 8. Copy pins — guarantee wording and the shops demand framing
// ---------------------------------------------------------------------

test("guarantee: the owner's set policy — 14 days, refund or credit (conversion pass, 2026-11-20)", () => {
  assert.equal(en.pricing.guaranteeLabel, "Our promise.");
  // Pass #20 pinned "no invented refund terms" because Frantz had
  // not set a policy. He has now (2026-11-20, via the approved
  // conversion audit): the wording states the real policy, and
  // /terms publishes the same terms in its Billing section.
  assert.equal(
    en.pricing.guarantee,
    "If a paid report doesn't help you, email support within 14 days and we'll refund it or credit your account.",
  );
  const cards = readFileSync(join(process.cwd(), "components/PlanCards.tsx"), "utf8");
  assert.ok(cards.includes("pricing.guarantee"), "the badge renders from the catalog");
  const terms = readFileSync(join(process.cwd(), "app/terms/page.tsx"), "utf8");
  assert.ok(terms.includes("9. Billing"), "/terms carries the Billing section");
  assert.ok(terms.includes("within 14 days"), "/terms states the same 14-day policy");
});

test("shops framing: drivers ready to act, settled credit model, no invented volumes", () => {
  assert.equal(en.shopsPage.heading, "Drivers ready to act");
  assert.ok(
    en.shopsPage.plan.body.includes("Get started free, no card to start."),
    "the shops plan states the free start plainly (2026-11-20 terms change)",
  );
  assert.ok(
    !en.shopsPage.plan.body.includes("14 days free") && !en.shopsPage.plan.body.includes("25 diagnoses"),
    "the old 14-day / 25-diagnosis promise is no longer made to new visitors",
  );
  assert.ok(en.shopsPage.plan.body.includes("500 diagnosis credits"), "the settled monthly bucket is stated");
  const text = `${en.shopsPage.heading} ${en.shopsPage.sub} ${en.shopsPage.plan.body}`;
  assert.ok(!/\d[\d,]*\s*(shops|garages|customers|drivers)\s+(already|use|trust)/i.test(text), "no invented adoption numbers");
});

// ---------------------------------------------------------------------
// Wiring pins — the result surface and the demo carry the new blocks
// ---------------------------------------------------------------------

test("diagnose page: severity headline leads, shop script + share + outcome close the result", () => {
  const page = readFileSync(join(process.cwd(), "app/app/diagnose/page.tsx"), "utf8");
  assert.ok(page.includes("driveVerdict(report)"), "the headline derives from the report");
  assert.ok(page.includes("<ShopScript"), "the counter script renders");
  assert.ok(page.includes("<DiagnosisShare"), "the share card renders");
  assert.ok(page.includes("<DiagnosisOutcome"), "the outcome prompt renders");
  assert.ok(page.includes("setDiagnosisId(event.diagnosisId"), "the saved id is captured from the stream");
  const done = readFileSync(join(process.cwd(), "lib/server/diagnoseService.ts"), "utf8");
  assert.ok(done.includes("diagnosisId"), "the done event carries the saved id");
});

test("guided demo: the sample flow carries the same headline + shop script treatment", () => {
  const demo = readFileSync(join(process.cwd(), "components/GuidedDemo.tsx"), "utf8");
  assert.ok(demo.includes("d.step1Headline"), "the sample reading leads with the stop-band headline");
  assert.ok(demo.includes("d.step2Script"), "the sample quote check closes with the counter script");
  assert.equal(en.demo.step1Headline, "Do not drive — get help now");
  assert.ok(en.demo.step2Script.includes("above the estimate range"), "the sample script uses the safer range language");
  assert.ok(!/rip-?off/i.test(en.demo.step2Script), "the sample script never accuses the shop");
});
