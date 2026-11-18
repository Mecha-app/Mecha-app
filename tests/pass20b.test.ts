/**
 * Pass #20b — past diagnoses become reachable (owner's live
 * exercise, 2026-11-18): Pass #20's share + outcome controls worked
 * only on the fresh result screen, because the dashboard's Recent
 * list and the Vault's history rendered entries as static text.
 * This pass adds the per-diagnosis detail view and links both
 * histories to it, reconciles the fair-range surfaces onto the
 * stored record, and ends the empty-state flicker (a loading state
 * precedes any "no diagnoses yet" copy).
 *
 * The price-truth pin is the heart of it: the range on the result
 * screen at run time, the range in the stored record, the range in
 * the history summaries, and the range on the share card are ONE
 * number — proven here end-to-end over the real service path.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { DiagnosisReport } from "../lib/server/ai";
import { MemoryAppStore, type DiagnosisSummary } from "../lib/server/appStore";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import { buildShareCard } from "../lib/server/diagnosisExtras";
import { StubDiagnosisProvider } from "../lib/server/provider";
import {
  createShare,
  readDiagnosisDetail,
  recordOutcome,
  resolveShareCard,
} from "../lib/server/shareService";
import { MemoryIdentityStore } from "../lib/server/store";
import { getVehicleDetail } from "../lib/server/vehicleService";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ---------------------------------------------------------------------
// The detail read — the stored record, owner-only, outcome attached
// ---------------------------------------------------------------------

const REPORT: DiagnosisReport = {
  severity: "Critical",
  safeToDriver: false,
  diagnosis:
    "A grinding noise when braking typically indicates severely worn brake pads or damaged rotors, which can lead to brake failure if not addressed immediately.",
  estimatedCost: { min: 200, max: 400 },
  laborHours: { min: 1, max: 2 },
  parts: [
    {
      name: "Brake pads",
      estimatedCost: "$80-150",
      likelihood: "likely",
      description: "Worn down to the metal backing plate.",
    },
    {
      name: "Brake rotors",
      estimatedCost: "$120-250",
      likelihood: "conditional",
      description: "Scored by metal-on-metal contact.",
    },
  ],
  steps: ["Do not drive the car.", "Have it towed to a shop for a brake inspection."],
  tip: "Ask the shop to measure the rotor thickness before replacing them.",
  disclaimer: "AI-assisted information, not an inspection.",
};

async function seeded() {
  const store = new MemoryIdentityStore();
  const owner = await store.createUser({ name: "Owner", email: "owner@example.com" });
  const other = await store.createUser({ name: "Other", email: "other@example.com" });
  const saved = await store.saveDiagnosisRecord({
    userId: owner.id,
    vehicleId: null,
    vehicleInfo: "2013 Ford F-150 XLT",
    problemText: "Grinding noise when I press the brakes, started last week",
    aiResult: REPORT,
  });
  return { store, owner, other, diagnosisId: saved.id };
}

test("detail read: the owner gets the stored record whole — its own range, verdict fields, and no outcome yet", async () => {
  const { store, owner, diagnosisId } = await seeded();
  const { diagnosis, outcome } = await readDiagnosisDetail(store, owner.id, diagnosisId);
  assert.equal(diagnosis.id, diagnosisId);
  assert.equal(diagnosis.vehicleInfo, "2013 Ford F-150 XLT");
  const stored = diagnosis.aiResult as DiagnosisReport;
  assert.deepEqual(stored.estimatedCost, { min: 200, max: 400 }, "the record holds the run's range");
  assert.equal(stored.severity, "Critical");
  assert.equal(stored.safeToDriver, false);
  assert.equal(outcome, null, "no outcome recorded yet — the prompt stands ready");
});

test("detail read: another driver's id — and a missing id — are indistinguishable", async () => {
  const { store, other, diagnosisId } = await seeded();
  await assert.rejects(() => readDiagnosisDetail(store, other.id, diagnosisId), /not found/i);
  await assert.rejects(
    () => readDiagnosisDetail(store, other.id, "no-such-diagnosis"),
    /not found/i,
  );
});

test("outcome from the detail: saving through the outcome API lands on the detail read", async () => {
  const { store, owner, diagnosisId } = await seeded();
  await recordOutcome(store, owner.id, diagnosisId, {
    whatFixed: "New pads and rotors, front axle",
    costUsd: 340,
    rating: 5,
  });
  const { outcome } = await readDiagnosisDetail(store, owner.id, diagnosisId);
  assert.ok(outcome, "the saved outcome rides along on the detail read");
  assert.equal(outcome.whatFixed, "New pads and rotors, front axle");
  assert.equal(outcome.costUsd, 340);
  assert.equal(outcome.rating, 5);
  assert.equal(outcome.quotePermission, false, "quote permission still defaults to NO from this door too");
});

test("share from the detail: minting against a past diagnosis resolves to the same stored range", async () => {
  const { store, owner, diagnosisId } = await seeded();
  const { diagnosis } = await readDiagnosisDetail(store, owner.id, diagnosisId);
  const { token } = await createShare(store, owner.id, diagnosis.id);
  const resolved = await resolveShareCard(store, token);
  assert.ok(resolved);
  assert.equal(resolved.card.costLabel, "$200–$400", "the public card shows the stored record's range");
  assert.equal(resolved.card.headline, "Do not drive — get help now", "the stored verdict leads the card");
  assert.equal(resolved.card.vehicle, "2013 Ford F-150 XLT");
});

// ---------------------------------------------------------------------
// The price-truth chain — one number from run time to every surface
// ---------------------------------------------------------------------

test("price truth: run-time range = stored range = detail range = history range = share range", async () => {
  const store = new MemoryIdentityStore();
  const user = await store.createUser({ name: "Runner", email: "runner@example.com" });
  const provider = new StubDiagnosisProvider();
  const events: DiagnoseServiceEvent[] = [];
  for await (const event of executeDiagnosis(
    { store, provider },
    {
      user,
      request: {
        problem: "Grinding noise when I press the brakes",
        vehicleInfo: "2013 Ford F-150 XLT",
      },
    },
  )) {
    events.push(event);
  }
  const done = events.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done, "the run completes");
  const runRange = (done.report as DiagnosisReport).estimatedCost;
  assert.deepEqual(runRange, { min: 180, max: 340 }, "the stub's run-time range");
  assert.ok(done.diagnosisId, "the run was saved");

  // The stored record — the object every later surface reads.
  const record = await store.findDiagnosisRecord(done.diagnosisId);
  assert.ok(record);
  assert.deepEqual(
    (record.aiResult as DiagnosisReport).estimatedCost,
    runRange,
    "the stored record holds exactly the range the driver was shown",
  );

  // The detail read.
  const { diagnosis } = await readDiagnosisDetail(store, user.id, done.diagnosisId);
  assert.deepEqual((diagnosis.aiResult as DiagnosisReport).estimatedCost, runRange);

  // The history summaries (dashboard recent + Vault vehicle history
  // read the same record through the app store in production; here
  // the summary is the saved record itself, as both Pg stores return
  // it).
  const app = new MemoryAppStore();
  const vehicle = await app.createVehicle({
    ownerId: user.id,
    year: "2013",
    make: "Ford",
    model: "F-150",
    engine: "5.0L V8",
    mileage: 120000,
  });
  const summary: DiagnosisSummary = {
    id: record.id,
    userId: record.userId,
    vehicleId: vehicle.id,
    vehicleInfo: record.vehicleInfo,
    problemText: record.problemText,
    imageUrl: record.imageUrl,
    aiResult: record.aiResult,
    createdAt: record.createdAt,
  };
  app.diagnoses.push(summary);
  const recent = await app.listRecentDiagnoses(user.id, 5);
  assert.deepEqual(
    (recent[0].aiResult as DiagnosisReport).estimatedCost,
    runRange,
    "the dashboard's recent list carries the run's range",
  );
  const detail = await getVehicleDetail(app, user.id, vehicle.id);
  assert.deepEqual(
    (detail.diagnoses[0].aiResult as DiagnosisReport).estimatedCost,
    runRange,
    "the Vault history carries the run's range",
  );

  // The share card built from the stored record.
  const card = buildShareCard({
    vehicleInfo: record.vehicleInfo,
    problemText: record.problemText,
    report: record.aiResult as DiagnosisReport,
    createdAt: record.createdAt,
  });
  assert.equal(card.costLabel, "$180–$340", "the share card prints the same range");
});

// ---------------------------------------------------------------------
// Wiring pins — the detail view, the linked histories, the loading
// states, and the owner-gated read route
// ---------------------------------------------------------------------

test("detail page: renders the stored record with the result view's blocks + share + outcome", () => {
  const page = read("app/app/diagnoses/[id]/page.tsx");
  assert.ok(page.includes("<AppNav"), "the app shell (logo home) is present");
  assert.ok(page.includes("driveVerdict(report)"), "the severity headline derives from the stored report");
  assert.ok(page.includes("report.estimatedCost.min"), "the fair range comes from the stored report");
  assert.ok(page.includes("<ShopScript"), "the counter script renders");
  assert.ok(page.includes("HumanHelpCard"), "the human-help route renders");
  assert.ok(page.includes("<DiagnosisShare"), "the share control works from the detail view");
  assert.ok(page.includes("<DiagnosisOutcome"), "the outcome prompt works from the detail view");
  assert.ok(page.includes("outcome.whatFixed"), "a saved outcome is shown as the record it is");
  assert.ok(page.includes("/api/diagnoses/${id}"), "the page reads the owner-gated detail route");
  assert.ok(page.includes('role="status"'), "a loading state precedes the record");
});

test("detail route: GET is driver-gated and serves the detail read", () => {
  const route = read("app/api/diagnoses/[id]/route.ts");
  assert.ok(route.includes('requireAuth(request, ["driver"])'), "the account gate runs first");
  assert.ok(route.includes("readDiagnosisDetail"), "the route serves the owner-checked read");
  assert.ok(route.includes("export async function GET"), "it is a read route");
});

test("histories link: dashboard recent rows and Vault history entries open the detail view", () => {
  const dash = read("app/app/page.tsx");
  assert.ok(
    dash.includes("href={`/app/diagnoses/${diag.id}`}"),
    "each dashboard recent row links to its diagnosis",
  );
  const vault = read("app/app/vault/page.tsx");
  assert.ok(
    vault.includes("href={`/app/diagnoses/${diag.id}`}"),
    "each Vault history entry links to its diagnosis",
  );
  const diagnose = read("app/app/diagnose/page.tsx");
  assert.ok(
    diagnose.includes("href={`/app/diagnoses/${diagnosisId}`}"),
    "a fresh result links straight to its saved record",
  );
});

test("loading precedes empty: dashboard recent and Vault history gate their empty copy on a completed fetch", () => {
  const dash = read("app/app/page.tsx");
  assert.ok(dash.includes("!driverLoaded"), "the dashboard gates on its first load");
  const recentAt = dash.indexOf("d.recentDiagnoses");
  const loadingAt = dash.indexOf("Loading…", recentAt);
  const emptyAt = dash.indexOf("d.noDiagnoses", recentAt);
  assert.ok(loadingAt > recentAt && emptyAt > loadingAt, "in the recent card: loading renders before the empty state can");

  const vault = read("app/app/vault/page.tsx");
  assert.ok(vault.includes("vehiclesLoaded"), "the Vault gates its content on the first vehicles fetch");
  assert.ok(vault.includes("historyLoading"), "the Vault history has its own loading state");
  const historyAt = vault.indexOf("v.historyTitle");
  const hLoadingAt = vault.indexOf("historyLoading", historyAt);
  const hEmptyAt = vault.indexOf("v.noHistory", historyAt);
  assert.ok(hLoadingAt > historyAt && hEmptyAt > hLoadingAt, "in the history: loading renders before the empty copy can");
});
