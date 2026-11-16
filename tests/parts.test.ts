/**
 * Parts affiliate package tests — the "what to do next" block.
 *
 * Run: npm test (compiles lib/server + tests, then node --test).
 * Everything runs against the parts module directly plus the WP5
 * in-memory store + stub provider for the invariance case: NO real
 * database, NO real AI call, NO network.
 *
 * The owner's three hard rules, as tests:
 *   (a) FITMENT — year/make/model/engine ride in every outbound link.
 *   (b) HONEST LABELING — the FTC disclosure is in the render data in
 *       every variant; no invented prices; a discount renders ONLY
 *       off a declared program discount WITH its terms on file.
 *   (c) DIAGNOSIS INTEGRITY — the finished diagnosis output is
 *       byte-identical whether or not the affiliate layer is
 *       exercised, and neither side imports the other (source guard).
 * Plus: env tags (Amazon), the no-tag plain-search fallback, and the
 * shop-ordering framing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "<redacted_jwt_1>";

import { registerDriver } from "../lib/server/authService";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import type { DiagnosisReport } from "../lib/server/ai";
import {
  PARTS_DISCLOSURE,
  RETAILER_TEMPLATES,
  buildPartsBlock,
  deriveFitment,
  getPartsConfig,
  type PartsConfig,
} from "../lib/server/parts";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { MemoryIdentityStore } from "../lib/server/store";

const DIAGNOSIS = {
  parts: [
    {
      name: "Alternator",
      estimatedCost: "$230-390",
      likelihood: "likely",
      description: "The charging voltage collapses under load — the alternator is failing.",
    },
    {
      name: "Serpentine belt",
      estimatedCost: "$25-60",
      likelihood: "conditional",
      description: "Replace with the alternator if it shows cracks or glazing.",
    },
  ],
};

const VEHICLE = { year: 2019, make: "Honda", model: "Accord", engine: "2.0L" };

function decoded(url: string): string {
  return decodeURIComponent(url);
}

test("(a) fitment: year/make/model/engine are in EVERY outbound link", () => {
  const block = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
  assert.equal(block.fitment.complete, true);
  assert.equal(block.fitment.display, "2019 Honda Accord · 2.0L engine");
  assert.equal(block.parts.length, 2);
  for (const part of block.parts) {
    assert.ok(part.links.length >= 3, "multiple retailer doors per part");
    assert.ok(part.fitmentNote.includes("2019 Honda Accord"), "fitment stated to the user");
    for (const link of part.links) {
      const url = decoded(link.url);
      for (const token of ["2019", "Honda", "Accord", "2.0L"]) {
        assert.ok(url.includes(token), `${link.retailerName} link missing fitment token ${token}: ${url}`);
      }
      assert.ok(url.includes(part.name), "the part itself rides in the query");
    }
  }
});

test("(a) fitment: free-text vehicleInfo parses to year/make/model/engine", () => {
  const fitment = deriveFitment({ vehicleInfo: "2021 Toyota RAV4 2.5L" });
  assert.equal(fitment.year, "2021");
  assert.equal(fitment.make, "Toyota");
  assert.equal(fitment.model, "RAV4");
  assert.equal(fitment.engine, "2.5L");
  assert.equal(fitment.complete, true);

  const block = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: { vehicleInfo: "2019 Honda Accord" } });
  assert.equal(block.fitment.complete, true);
  for (const link of block.parts[0].links) {
    const url = decoded(link.url);
    assert.ok(url.includes("2019") && url.includes("Honda") && url.includes("Accord"));
  }

  // No vehicle at all: the block says so instead of faking fitment.
  const bare = buildPartsBlock({ diagnosis: DIAGNOSIS });
  assert.equal(bare.fitment.complete, false);
  assert.ok(bare.parts[0].fitmentNote.includes("wasn't fully specified"));
});

test("(b) disclosure: present in the render data in every variant", () => {
  const variants = [
    buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE }),
    buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, audience: "shop" }),
    buildPartsBlock({ diagnosis: { parts: [] }, vehicle: VEHICLE }),
    buildPartsBlock({
      diagnosis: DIAGNOSIS,
      vehicle: VEHICLE,
      config: getPartsConfig({ AFFILIATE_TAG_AMAZON: "mecha-20" }),
    }),
  ];
  for (const block of variants) {
    assert.equal(block.disclosure, PARTS_DISCLOSURE);
    assert.ok(block.disclosure.includes("may earn a commission"));
    assert.ok(block.disclosure.includes("never changes the price you pay"));
    assert.equal(block.heading, "What to do next");
  }
});

test("(b) price honesty: no invented prices, sponsored rel, new tab", () => {
  const block = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
  for (const part of block.parts) {
    assert.equal(part.priceCta, "Check price");
    assert.ok(!("price" in part), "no price field may exist on an offer");
    // The only money figure allowed is the DIAGNOSIS's own estimate,
    // labeled as MECHA's estimate — never as a live price.
    assert.ok(part.estimateLabel?.startsWith("MECHA's estimate:"));
    for (const link of part.links) {
      assert.equal(link.rel, "sponsored nofollow noopener");
      assert.equal(link.target, "_blank");
    }
  }
});

test("(b) discount: renders ONLY off a declared discount WITH terms on file", () => {
  // Default config declares none.
  const plain = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
  assert.equal(plain.discountNote, null);

  const base = RETAILER_TEMPLATES[0];
  const withDiscount: PartsConfig = {
    retailers: [
      {
        ...base,
        tag: null,
        discount: { label: "5% off your first parts order", termsUrl: "https://example.test/terms" },
      },
    ],
  };
  const declared = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, config: withDiscount });
  assert.ok(declared.discountNote);
  assert.equal(declared.discountNote.label, "5% off your first parts order");
  assert.equal(declared.discountNote.termsUrl, "https://example.test/terms");

  // A label without terms on file is NOT a discount — it must not render.
  const noTerms: PartsConfig = {
    retailers: [{ ...base, tag: null, discount: { label: "5% off", termsUrl: "" } }],
  };
  const suppressed = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, config: noTerms });
  assert.equal(suppressed.discountNote, null);
});

test("tags: AFFILIATE_TAG_AMAZON wires in from env; absent tag = plain search links", () => {
  const untagged = buildPartsBlock({
    diagnosis: DIAGNOSIS,
    vehicle: VEHICLE,
    config: getPartsConfig({}),
  });
  for (const part of untagged.parts) {
    for (const link of part.links) {
      assert.ok(!link.url.includes("tag="), `unwired link must carry no tag: ${link.url}`);
    }
  }
  const amazon = untagged.parts[0].links.find((l) => l.retailerKey === "amazon");
  assert.ok(amazon?.url.startsWith("https://www.amazon.com/s?k="), "plain search link still works");

  const tagged = buildPartsBlock({
    diagnosis: DIAGNOSIS,
    vehicle: VEHICLE,
    config: getPartsConfig({ AFFILIATE_TAG_AMAZON: "mecha-20" }),
  });
  const taggedAmazon = tagged.parts[0].links.find((l) => l.retailerKey === "amazon");
  assert.ok(taggedAmazon?.url.includes("tag=mecha-20"));
  for (const link of tagged.parts[0].links) {
    if (link.retailerKey !== "amazon") {
      assert.ok(!link.url.includes("mecha-20"), "one retailer's tag never leaks to another");
    }
  }
  // The disclosure does not change with wiring.
  assert.equal(tagged.disclosure, untagged.disclosure);
});

test("shop framing: the same block, framed as shop ordering", () => {
  const driver = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, audience: "driver" });
  const shop = buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, audience: "shop" });
  assert.equal(shop.audience, "shop");
  assert.equal(shop.doors.diy.label, "Order parts for this job");
  assert.ok(shop.intro.includes("your shop's basket") || shop.intro.includes("Stock the parts"));
  assert.notEqual(shop.doors.diy.label, driver.doors.diy.label);
  assert.equal(shop.disclosure, driver.disclosure);
  // Link construction is identical — only the framing differs.
  assert.deepEqual(
    shop.parts.map((p) => p.links.map((l) => l.url)),
    driver.parts.map((p) => p.links.map((l) => l.url)),
  );
});

async function collect(
  gen: AsyncGenerator<DiagnoseServiceEvent>,
): Promise<DiagnoseServiceEvent[]> {
  const events: DiagnoseServiceEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

/** Serialize a run for comparison. The ONE field excluded is the
 *  latency stopwatch (ttftMs/totalMs): it is a wall-clock reading that
 *  differs between any two runs of anything, affiliate layer or not.
 *  Every other byte — deltas, quota, messages, the report — must be
 *  identical. */
function serializeRun(events: DiagnoseServiceEvent[]): string {
  return JSON.stringify(events, (key, value) => (key === "latency" ? null : value));
}

async function runDiagnosisOnce(): Promise<DiagnoseServiceEvent[]> {
  const store = new MemoryIdentityStore();
  await registerDriver(store, {
    name: "Parts Driver",
    email: "parts@example.com",
    phone: "(617) 555-0134",
    password: "<redacted>",
  });
  const user = await store.findUserByEmail("parts@example.com");
  assert.ok(user);
  const provider = new StubDiagnosisProvider();
  return collect(
    executeDiagnosis(
      { store, provider },
      { user, request: { problem: "Grinding noise when braking", vehicleInfo: "2019 Honda Accord" } },
    ),
  );
}

test("(c) diagnosis invariance: byte-identical output with the affiliate layer on vs off", async () => {
  // OFF: the diagnosis runs; the affiliate layer never exists.
  const offEvents = await runDiagnosisOnce();
  const offDone = offEvents.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(offDone);

  // ON: the affiliate layer is exercised BEFORE the run (from a canned
  // finished report) and AFTER the run (from this run's own report) —
  // neither may move a single byte of the diagnosis stream.
  buildPartsBlock({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
  const onEvents = await runDiagnosisOnce();
  const onDone = onEvents.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(onDone);
  const block = buildPartsBlock({
    diagnosis: onDone.report as DiagnosisReport,
    vehicle: { vehicleInfo: "2019 Honda Accord" },
  });
  assert.ok(block.parts.length > 0, "the layer did consume the finished report");

  assert.equal(
    JSON.stringify(onDone.report),
    JSON.stringify(offDone.report),
    "the report bytes are identical with the affiliate layer on vs off",
  );
  assert.equal(
    serializeRun(onEvents),
    serializeRun(offEvents),
    "the full event stream is identical apart from the latency stopwatch",
  );
});

test("(c) structural guard: neither side imports the other", () => {
  const root = process.cwd();
  const partsSrc = readFileSync(join(root, "lib/server/parts.ts"), "utf8");
  for (const forbidden of ["./ai", "./provider", "./diagnoseService"]) {
    assert.ok(
      !partsSrc.includes(`from "${forbidden}"`) && !partsSrc.includes(`from "${forbidden}/`),
      `parts.ts must not import ${forbidden} — it consumes finished output only`,
    );
  }
  for (const file of ["ai.ts", "provider.ts", "diagnoseService.ts"]) {
    const src = readFileSync(join(root, "lib/server", file), "utf8");
    assert.ok(!src.includes('"./parts"'), `${file} must not import the affiliate layer`);
  }
});
