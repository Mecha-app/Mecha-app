"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "<redacted_jwt_1>";
const authService_1 = require("../lib/server/authService");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const parts_1 = require("../lib/server/parts");
const provider_1 = require("../lib/server/provider");
const store_1 = require("../lib/server/store");
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
function decoded(url) {
    return decodeURIComponent(url);
}
(0, node_test_1.test)("(a) fitment: year/make/model/engine are in EVERY outbound link", () => {
    const block = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
    strict_1.default.equal(block.fitment.complete, true);
    strict_1.default.equal(block.fitment.display, "2019 Honda Accord · 2.0L engine");
    strict_1.default.equal(block.parts.length, 2);
    for (const part of block.parts) {
        strict_1.default.ok(part.links.length >= 3, "multiple retailer doors per part");
        strict_1.default.ok(part.fitmentNote.includes("2019 Honda Accord"), "fitment stated to the user");
        for (const link of part.links) {
            const url = decoded(link.url);
            for (const token of ["2019", "Honda", "Accord", "2.0L"]) {
                strict_1.default.ok(url.includes(token), `${link.retailerName} link missing fitment token ${token}: ${url}`);
            }
            strict_1.default.ok(url.includes(part.name), "the part itself rides in the query");
        }
    }
});
(0, node_test_1.test)("(a) fitment: free-text vehicleInfo parses to year/make/model/engine", () => {
    const fitment = (0, parts_1.deriveFitment)({ vehicleInfo: "2021 Toyota RAV4 2.5L" });
    strict_1.default.equal(fitment.year, "2021");
    strict_1.default.equal(fitment.make, "Toyota");
    strict_1.default.equal(fitment.model, "RAV4");
    strict_1.default.equal(fitment.engine, "2.5L");
    strict_1.default.equal(fitment.complete, true);
    const block = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: { vehicleInfo: "2019 Honda Accord" } });
    strict_1.default.equal(block.fitment.complete, true);
    for (const link of block.parts[0].links) {
        const url = decoded(link.url);
        strict_1.default.ok(url.includes("2019") && url.includes("Honda") && url.includes("Accord"));
    }
    // No vehicle at all: the block says so instead of faking fitment.
    const bare = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS });
    strict_1.default.equal(bare.fitment.complete, false);
    strict_1.default.ok(bare.parts[0].fitmentNote.includes("wasn't fully specified"));
});
(0, node_test_1.test)("(b) disclosure: present in the render data in every variant", () => {
    const variants = [
        (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE }),
        (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, audience: "shop" }),
        (0, parts_1.buildPartsBlock)({ diagnosis: { parts: [] }, vehicle: VEHICLE }),
        (0, parts_1.buildPartsBlock)({
            diagnosis: DIAGNOSIS,
            vehicle: VEHICLE,
            config: (0, parts_1.getPartsConfig)({ AFFILIATE_TAG_AMAZON: "mecha-20" }),
        }),
    ];
    for (const block of variants) {
        strict_1.default.equal(block.disclosure, parts_1.PARTS_DISCLOSURE);
        strict_1.default.ok(block.disclosure.includes("may earn a commission"));
        strict_1.default.ok(block.disclosure.includes("never changes the price you pay"));
        strict_1.default.equal(block.heading, "What to do next");
    }
});
(0, node_test_1.test)("(b) price honesty: no invented prices, sponsored rel, new tab", () => {
    const block = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
    for (const part of block.parts) {
        strict_1.default.equal(part.priceCta, "Check price");
        strict_1.default.ok(!("price" in part), "no price field may exist on an offer");
        // The only money figure allowed is the DIAGNOSIS's own estimate,
        // labeled as MECHA's estimate — never as a live price.
        strict_1.default.ok(part.estimateLabel?.startsWith("MECHA's estimate:"));
        for (const link of part.links) {
            strict_1.default.equal(link.rel, "sponsored nofollow noopener");
            strict_1.default.equal(link.target, "_blank");
        }
    }
});
(0, node_test_1.test)("(b) discount: renders ONLY off a declared discount WITH terms on file", () => {
    // Default config declares none.
    const plain = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
    strict_1.default.equal(plain.discountNote, null);
    const base = parts_1.RETAILER_TEMPLATES[0];
    const withDiscount = {
        retailers: [
            {
                ...base,
                tag: null,
                discount: { label: "5% off your first parts order", termsUrl: "https://example.test/terms" },
            },
        ],
    };
    const declared = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, config: withDiscount });
    strict_1.default.ok(declared.discountNote);
    strict_1.default.equal(declared.discountNote.label, "5% off your first parts order");
    strict_1.default.equal(declared.discountNote.termsUrl, "https://example.test/terms");
    // A label without terms on file is NOT a discount — it must not render.
    const noTerms = {
        retailers: [{ ...base, tag: null, discount: { label: "5% off", termsUrl: "" } }],
    };
    const suppressed = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, config: noTerms });
    strict_1.default.equal(suppressed.discountNote, null);
});
(0, node_test_1.test)("tags: AFFILIATE_TAG_AMAZON wires in from env; absent tag = plain search links", () => {
    const untagged = (0, parts_1.buildPartsBlock)({
        diagnosis: DIAGNOSIS,
        vehicle: VEHICLE,
        config: (0, parts_1.getPartsConfig)({}),
    });
    for (const part of untagged.parts) {
        for (const link of part.links) {
            strict_1.default.ok(!link.url.includes("tag="), `unwired link must carry no tag: ${link.url}`);
        }
    }
    const amazon = untagged.parts[0].links.find((l) => l.retailerKey === "amazon");
    strict_1.default.ok(amazon?.url.startsWith("https://www.amazon.com/s?k="), "plain search link still works");
    const tagged = (0, parts_1.buildPartsBlock)({
        diagnosis: DIAGNOSIS,
        vehicle: VEHICLE,
        config: (0, parts_1.getPartsConfig)({ AFFILIATE_TAG_AMAZON: "mecha-20" }),
    });
    const taggedAmazon = tagged.parts[0].links.find((l) => l.retailerKey === "amazon");
    strict_1.default.ok(taggedAmazon?.url.includes("tag=mecha-20"));
    for (const link of tagged.parts[0].links) {
        if (link.retailerKey !== "amazon") {
            strict_1.default.ok(!link.url.includes("mecha-20"), "one retailer's tag never leaks to another");
        }
    }
    // The disclosure does not change with wiring.
    strict_1.default.equal(tagged.disclosure, untagged.disclosure);
});
(0, node_test_1.test)("shop framing: the same block, framed as shop ordering", () => {
    const driver = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, audience: "driver" });
    const shop = (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE, audience: "shop" });
    strict_1.default.equal(shop.audience, "shop");
    strict_1.default.equal(shop.doors.diy.label, "Order parts for this job");
    strict_1.default.ok(shop.intro.includes("your shop's basket") || shop.intro.includes("Stock the parts"));
    strict_1.default.notEqual(shop.doors.diy.label, driver.doors.diy.label);
    strict_1.default.equal(shop.disclosure, driver.disclosure);
    // Link construction is identical — only the framing differs.
    strict_1.default.deepEqual(shop.parts.map((p) => p.links.map((l) => l.url)), driver.parts.map((p) => p.links.map((l) => l.url)));
});
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
/** Serialize a run for comparison. The ONE field excluded is the
 *  latency stopwatch (ttftMs/totalMs): it is a wall-clock reading that
 *  differs between any two runs of anything, affiliate layer or not.
 *  Every other byte — deltas, quota, messages, the report — must be
 *  identical. */
function serializeRun(events) {
    return JSON.stringify(events, (key, value) => (key === "latency" ? null : value));
}
async function runDiagnosisOnce() {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, {
        name: "Parts Driver",
        email: "parts@example.com",
        phone: "(617) 555-0134",
        password: "<redacted>",
    });
    const user = await store.findUserByEmail("parts@example.com");
    strict_1.default.ok(user);
    const provider = new provider_1.StubDiagnosisProvider();
    return collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: { problem: "Grinding noise when braking", vehicleInfo: "2019 Honda Accord" } }));
}
(0, node_test_1.test)("(c) diagnosis invariance: byte-identical output with the affiliate layer on vs off", async () => {
    // OFF: the diagnosis runs; the affiliate layer never exists.
    const offEvents = await runDiagnosisOnce();
    const offDone = offEvents.find((e) => e.type === "done");
    strict_1.default.ok(offDone);
    // ON: the affiliate layer is exercised BEFORE the run (from a canned
    // finished report) and AFTER the run (from this run's own report) —
    // neither may move a single byte of the diagnosis stream.
    (0, parts_1.buildPartsBlock)({ diagnosis: DIAGNOSIS, vehicle: VEHICLE });
    const onEvents = await runDiagnosisOnce();
    const onDone = onEvents.find((e) => e.type === "done");
    strict_1.default.ok(onDone);
    const block = (0, parts_1.buildPartsBlock)({
        diagnosis: onDone.report,
        vehicle: { vehicleInfo: "2019 Honda Accord" },
    });
    strict_1.default.ok(block.parts.length > 0, "the layer did consume the finished report");
    strict_1.default.equal(JSON.stringify(onDone.report), JSON.stringify(offDone.report), "the report bytes are identical with the affiliate layer on vs off");
    strict_1.default.equal(serializeRun(onEvents), serializeRun(offEvents), "the full event stream is identical apart from the latency stopwatch");
});
(0, node_test_1.test)("(c) structural guard: neither side imports the other", () => {
    const root = process.cwd();
    const partsSrc = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "lib/server/parts.ts"), "utf8");
    for (const forbidden of ["./ai", "./provider", "./diagnoseService"]) {
        strict_1.default.ok(!partsSrc.includes(`from "${forbidden}"`) && !partsSrc.includes(`from "${forbidden}/`), `parts.ts must not import ${forbidden} — it consumes finished output only`);
    }
    for (const file of ["ai.ts", "provider.ts", "diagnoseService.ts"]) {
        const src = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "lib/server", file), "utf8");
        strict_1.default.ok(!src.includes('"./parts"'), `${file} must not import the affiliate layer`);
    }
});
