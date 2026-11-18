/**
 * Pass #20c — ONE RANGE PER REPORT (owner's live exercise,
 * 2026-11-17 ~23:44 ET, verified twice by the parent's browser lane):
 * a live brake diagnosis on the test truck rendered $200–$400 on its
 * run-time result screen, while the record it saved — id
 * 181d2be2-3de5-4683-b9eb-0df8d49482e7 — carries $200–$600, which is
 * what the Vault card, the detail page, the shop script, and the
 * public share page all render.
 *
 * Root cause: the report carried TWO independently model-generated
 * range channels. The prompt asked for a headline `estimatedCost`
 * AND a per-part `estimatedCost` string, and parseReport passed the
 * part strings through unexamined (a cast). The run-time screen
 * rendered both — the headline range and, directly under the likely
 * repair's name, that part's own range ($200–$400 for "Brake pad
 * replacement") — while every filed surface speaks only the headline
 * range ($200–$600). Two numbers for one repair, nothing reconciling
 * them. Pass #20b's audit compared only the headline field across
 * the stored surfaces, and its price-truth test used a stub whose
 * part strings were never asserted — so the second channel was
 * invisible to it.
 *
 * The fix (this pass): the headline estimatedCost is the ONLY range
 * a report carries. The prompt no longer asks for per-part costs,
 * parseReport rebuilds parts field by field and drops any per-part
 * cost a model still returns (the one choke point every provider
 * shares), the result/detail part lists render no per-part figure,
 * and the parts/links route no longer forwards one — so the range
 * displayed at run time is the range stored, by construction.
 *
 * The regression test below drives the REAL service with a fixture
 * provider whose raw model output carries CONTRADICTING ranges —
 * headline $200–$600, part lines at $200–$400 and $150–$300 — and
 * asserts the set of ranges anywhere in the run-time report is
 * exactly {200–600} and equals the stored, detail, history, and
 * share ranges. Under the old code that set is three ranges wide
 * and the test fails; that is the point of it.
 *
 * Secondary pins: (a) the Vault history entry's content sits INSIDE
 * its detail Link; (b) the public share page dates the record via
 * the viewer-local LocalDate component, like the detail page;
 * (c) the detail read carries an existing share token and the
 * detail page opens the share control on the existing link.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildDiagnosisPrompt,
  parseReport,
  type DiagnosisReport,
  type DiagnosisRequest,
} from "../lib/server/ai";
import { MemoryAppStore, type DiagnosisSummary } from "../lib/server/appStore";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import { buildShopScript } from "../lib/server/diagnosisExtras";
import type { DiagnosisProvider, ProviderEvent } from "../lib/server/provider";
import {
  createShare,
  readDiagnosisDetail,
  resolveShareCard,
} from "../lib/server/shareService";
import { MemoryIdentityStore } from "../lib/server/store";
import { getVehicleDetail } from "../lib/server/vehicleService";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ---------------------------------------------------------------------
// The trap fixture — raw model output whose candidate range fields
// DIFFER, in the shape the pre-v2 prompt elicited. The narrative
// fields deliberately contain no dollar figures, so every $-range
// found in a parsed report comes from a range field, never prose.
// ---------------------------------------------------------------------

const RAW_MODEL_JSON = JSON.stringify({
  severity: "Critical",
  safeToDriver: false,
  diagnosis:
    "A grinding noise when braking typically indicates severely worn brake pads or damaged rotors, which can lead to brake failure if not addressed immediately.",
  estimatedCost: { min: 200, max: 600 },
  laborHours: { min: 1, max: 2 },
  parts: [
    {
      name: "Brake pad replacement",
      estimatedCost: "$200-400",
      likelihood: "likely",
      description: "The pads have worn down to the metal backing plate.",
    },
    {
      name: "Brake rotors",
      estimatedCost: "$150-300",
      likelihood: "conditional",
      description: "The rotors may be scored by metal-on-metal contact.",
    },
  ],
  steps: ["Do not drive the car.", "Have it towed to a shop for a brake inspection."],
  tip: "Ask the shop to measure the rotor thickness before replacing them.",
});

/**
 * A provider in the real providers' shape: stream the raw model text
 * as deltas, then parse the whole text with the shared parseReport
 * and yield it as the done event — the exact path production takes.
 */
class RawModelProvider implements DiagnosisProvider {
  readonly name = "raw-model-fixture";
  constructor(private readonly raw: string) {}
  async *stream(_req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    const started = performance.now();
    for (let i = 0; i < this.raw.length; i += 32) {
      yield { type: "delta", text: this.raw.slice(i, i + 32) };
    }
    const match = this.raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("diagnosis_parse_failed");
    yield {
      type: "done",
      report: parseReport(match[0]),
      model: "fixture-model",
      tier: "triage",
      latency: { ttftMs: 1, totalMs: performance.now() - started },
    };
  }
}

/** Every distinct price range a report carries, from any field. */
function collectRanges(report: DiagnosisReport): string[] {
  const found = new Set<string>();
  if (report.estimatedCost) {
    found.add(`${report.estimatedCost.min}-${report.estimatedCost.max}`);
  }
  const text = JSON.stringify(report);
  for (const m of text.matchAll(/\$(\d+)\s*[-–]\s*\$?(\d+)/g)) {
    found.add(`${m[1]}-${m[2]}`);
  }
  return [...found].sort();
}

// ---------------------------------------------------------------------
// The choke point — parse + prompt
// ---------------------------------------------------------------------

test("parse: a model that still returns per-part costs has them stripped at the choke point", () => {
  const report = parseReport(RAW_MODEL_JSON);
  assert.deepEqual(report.estimatedCost, { min: 200, max: 600 }, "the headline range survives");
  assert.equal(report.parts.length, 2, "the parts themselves survive");
  for (const part of report.parts) {
    assert.ok(!("estimatedCost" in part), `part "${part.name}" carries no cost field`);
    assert.ok(part.name.length > 0 && part.description.length > 0, "name and description survive");
  }
  assert.equal(report.parts[0].likelihood, "likely");
  assert.equal(report.parts[1].likelihood, "conditional");
  assert.deepEqual(collectRanges(report), ["200-600"], "exactly one range exists in the report");
});

test("prompt: the model is asked for exactly one range — the headline, never per-part", () => {
  const prompt = buildDiagnosisPrompt({
    problem: "Grinding noise when I press the brakes",
    vehicleInfo: "2013 Ford F-150 XLT",
  });
  assert.ok(
    prompt.includes('"estimatedCost": {"min": number, "max": number}'),
    "the headline range is still elicited",
  );
  const partsAt = prompt.indexOf('"parts"');
  assert.ok(partsAt > 0, "the parts schema is present");
  assert.ok(
    !prompt.slice(partsAt).includes("estimatedCost"),
    "the parts schema elicits no cost of its own",
  );
});

// ---------------------------------------------------------------------
// THE regression test — one range from run time to every surface,
// driven through the real diagnosis service with the trap fixture
// ---------------------------------------------------------------------

test("one range: run-time = stored = detail = history = share, even when the model offers three", async () => {
  const store = new MemoryIdentityStore();
  const user = await store.createUser({ name: "Runner", email: "runner20c@example.com" });
  const app = new MemoryAppStore();
  const vehicle = await app.createVehicle({
    ownerId: user.id,
    year: "2013",
    make: "Ford",
    model: "F-150",
    engine: "5.0L V8",
    mileage: 120000,
  });

  const events: DiagnoseServiceEvent[] = [];
  for await (const event of executeDiagnosis(
    { store, provider: new RawModelProvider(RAW_MODEL_JSON) },
    {
      user,
      request: {
        problem: "Grinding noise when I press the brakes, started last week.",
        vehicleInfo: "2013 Ford F-150 XLT",
      },
      vehicleId: vehicle.id,
    },
  )) {
    events.push(event);
  }
  const done = events.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done, "the run completes");
  assert.ok(done.diagnosisId, "the run was saved");

  // RUN TIME — the report the result screen renders carries ONE range.
  const runReport = done.report as DiagnosisReport;
  assert.deepEqual(runReport.estimatedCost, { min: 200, max: 600 });
  assert.deepEqual(
    collectRanges(runReport),
    ["200-600"],
    "the run-time report carries exactly one range — no part line contradicts it",
  );

  // STORED — the record is the very report the driver was shown.
  const record = await store.findDiagnosisRecord(done.diagnosisId);
  assert.ok(record);
  assert.deepEqual(
    record.aiResult,
    runReport,
    "the stored record is the run-time report, whole — displayed = stored",
  );

  // DETAIL — the owner's read-back of the same record.
  const { diagnosis } = await readDiagnosisDetail(store, user.id, done.diagnosisId);
  assert.deepEqual((diagnosis.aiResult as DiagnosisReport).estimatedCost, { min: 200, max: 600 });
  assert.deepEqual(collectRanges(diagnosis.aiResult as DiagnosisReport), ["200-600"]);

  // HISTORY — dashboard recent + Vault vehicle history read the record.
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
    collectRanges(recent[0].aiResult as DiagnosisReport),
    ["200-600"],
    "the dashboard's recent list carries the one range",
  );
  const vaultDetail = await getVehicleDetail(app, user.id, vehicle.id);
  assert.deepEqual(
    collectRanges(vaultDetail.diagnoses[0].aiResult as DiagnosisReport),
    ["200-600"],
    "the Vault history carries the one range",
  );

  // SHARE + SHOP SCRIPT — built from the stored record.
  const { token } = await createShare(store, user.id, done.diagnosisId);
  const resolved = await resolveShareCard(store, token);
  assert.ok(resolved);
  assert.equal(resolved.card.costLabel, "$200–$600", "the public card prints the one range");
  assert.ok(
    resolved.card.partNames.includes("Brake pad replacement"),
    "part names survive the strip — only their costs are gone",
  );
  const script = buildShopScript(record.aiResult as DiagnosisReport, record.vehicleInfo);
  assert.ok(
    script.some((line) => line.includes("$200–$600")),
    "the counter script speaks the one range",
  );
  assert.ok(
    !script.join(" ").includes("$200–$400") && !script.join(" ").includes("$150"),
    "no second range leaks into the script",
  );
});

// ---------------------------------------------------------------------
// Secondary (c) — an existing share link is state, not a fresh offer
// ---------------------------------------------------------------------

test("share state: the detail read carries an existing share token, and only then", async () => {
  const store = new MemoryIdentityStore();
  const owner = await store.createUser({ name: "Owner", email: "owner20c@example.com" });
  const saved = await store.saveDiagnosisRecord({
    userId: owner.id,
    vehicleId: null,
    vehicleInfo: "2013 Ford F-150 XLT",
    problemText: "Grinding noise when I press the brakes, started last week",
    aiResult: parseReport(RAW_MODEL_JSON),
  });

  const before = await readDiagnosisDetail(store, owner.id, saved.id);
  assert.equal(before.shareToken, null, "no link minted yet — the create offer is correct");

  const { token } = await createShare(store, owner.id, saved.id);
  const after = await readDiagnosisDetail(store, owner.id, saved.id);
  assert.equal(after.shareToken, token, "the detail read now carries the existing link");

  const again = await createShare(store, owner.id, saved.id);
  assert.equal(again.token, token, "minting is idempotent — the same link, never a second one");
});

// ---------------------------------------------------------------------
// Wiring pins — renderers, the parts route, items (a), (b), (c)
// ---------------------------------------------------------------------

test("renderers: no surface prints a per-part cost any more", () => {
  for (const rel of ["app/app/diagnose/page.tsx", "app/app/diagnoses/[id]/page.tsx"]) {
    const page = read(rel);
    assert.ok(!page.includes("part.estimatedCost"), `${rel} renders no per-part figure`);
    assert.ok(page.includes("report.estimatedCost.min"), `${rel} still leads with the one range`);
  }
  const route = read("app/api/parts/links/route.ts");
  assert.ok(
    !route.includes("str(r.estimatedCost"),
    "the parts route no longer forwards a per-part figure into the result screen's parts block",
  );
});

test("(a) Vault history: the entry's content sits INSIDE its detail link", () => {
  const vault = read("app/app/vault/page.tsx");
  const linkAt = vault.indexOf("href={`/app/diagnoses/${diag.id}`}");
  assert.ok(linkAt > 0, "the Vault history entry links to its diagnosis");
  const textAt = vault.indexOf("diag.aiResult?.diagnosis", linkAt);
  const closeAt = vault.indexOf("</Link>", linkAt);
  assert.ok(
    textAt > linkAt && closeAt > textAt,
    "the entry's date, text, and range render between the Link's open and close — a link, not plain text",
  );
});

test("(b) share date: the public card formats the date in the viewer's timezone, like the detail page", () => {
  const page = read("app/share/[token]/page.tsx");
  assert.ok(page.includes("<LocalDate"), "the share page renders its date through LocalDate");
  assert.ok(
    !page.includes("new Date(card.createdAt).toLocaleDateString()"),
    "the share page no longer formats the date on the server (UTC)",
  );
  const localDate = read("components/LocalDate.tsx");
  assert.ok(localDate.includes('"use client"'), "LocalDate is a client component");
  assert.ok(
    localDate.includes("setLabel(new Date(iso).toLocaleDateString())"),
    "after mount it formats with the viewer's own locale + timezone — the detail page's exact call",
  );
});

test("(c) share control: the detail page opens it on the existing link", () => {
  const detail = read("app/app/diagnoses/[id]/page.tsx");
  assert.ok(detail.includes("shareToken"), "the detail page reads the share state from the detail read");
  assert.ok(detail.includes("initialShareUrl"), "the detail page hands the existing link to the share control");
  const share = read("app/app/diagnose/DiagnosisShare.tsx");
  assert.ok(
    share.includes("useState(initialShareUrl ?? \"\")"),
    "the share control initializes on the existing link instead of the create offer",
  );
  const route = read("app/api/diagnoses/[id]/route.ts");
  assert.ok(route.includes("shareToken"), "the detail route serves the share state");
});
