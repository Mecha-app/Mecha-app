"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Pass 15 tests — saved-vehicle picker + diagnosis→vehicle linking
 * (owner, 2026-11-16): "I already added my vehicle — when I click
 * Diagnose it asks me to re-enter the vehicle again. It should give me
 * the option to click what I've already added." And, from his Vault:
 * the car showed "No diagnoses saved for this vehicle yet" after two
 * real runs, because the form never named the vehicle AND the service
 * only saved a record when a vehicleId arrived — so nothing was saved
 * at all.
 *
 * Pinned here:
 *   (a) THE PICKER — one shared SavedVehicleField; /app/diagnose and
 *       both /app/scan vehicle fields (photo + code) render it; the
 *       diagnose page sends the picked vehicle's id with the request
 *       and reads it back from a scan prefill; the component fetches
 *       the garage, offers an "Other vehicle…" escape, and falls back
 *       to free text (empty garage / failed fetch) instead of
 *       blocking. The composed string + option label helpers match
 *       the shapes the rest of the app already uses.
 *   (b) LINK ON SAVE — executeDiagnosis ALWAYS saves the record now:
 *       with the picked vehicle's id + the vehicle string when named,
 *       with a null id + the typed string when not, and on a cache hit
 *       too (a consumed run is a run).
 *   (c) VAULT HISTORY — getVehicleDetail merges the vehicle's linked
 *       diagnoses with the owner's unlinked ones whose saved string
 *       matches year+make+model (case-insensitive, trimmed, suffix
 *       tolerant), newest first; other cars and other owners never
 *       leak in.
 *   (d) THE STORAGE CONTRACT — migration 0016 makes vehicle_id
 *       nullable and adds vehicle_info; the Pg read for unlinked
 *       records is owner-scoped with vehicle_id IS NULL.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "<redacted>";
const vehicles_1 = require("../lib/client/vehicles");
const authService_1 = require("../lib/server/authService");
const appStore_1 = require("../lib/server/appStore");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const provider_1 = require("../lib/server/provider");
const scan_1 = require("../lib/server/scan");
const store_1 = require("../lib/server/store");
const vehicleService_1 = require("../lib/server/vehicleService");
const ROOT = process.cwd();
const read = (rel) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(ROOT, rel), "utf8");
const COROLLA = {
    id: "veh-corolla",
    year: "2015",
    make: "Toyota",
    model: "Corolla",
    trim: "LE",
    engine: "1.8L 4-cylinder",
    nickname: null,
};
/* ------------------------- (a) the picker ------------------------- */
(0, node_test_1.test)("picker: composed vehicle string mirrors the VIN-decode shape", () => {
    strict_1.default.equal((0, vehicles_1.savedVehicleInfo)(COROLLA), "2015 Toyota Corolla LE (1.8L 4-cylinder)");
    strict_1.default.equal((0, vehicles_1.savedVehicleInfo)({ ...COROLLA, trim: null, engine: null }), "2015 Toyota Corolla");
    strict_1.default.equal((0, vehicles_1.savedVehicleInfo)({ ...COROLLA, engine: null }), "2015 Toyota Corolla LE");
});
(0, node_test_1.test)("picker: option label leads with the nickname when one is set", () => {
    strict_1.default.equal((0, vehicles_1.savedVehicleLabel)(COROLLA), "2015 Toyota Corolla LE (1.8L 4-cylinder)");
    strict_1.default.equal((0, vehicles_1.savedVehicleLabel)({ ...COROLLA, nickname: "Daily" }), "Daily — 2015 Toyota Corolla");
});
(0, node_test_1.test)("picker: the shared component fetches the garage and keeps an escape hatch", () => {
    const src = read("components/SavedVehicleField.tsx");
    strict_1.default.match(src, /apiFetch<\{ vehicles\?: SavedVehicle\[\] \}>\("\/api\/vehicles"\)/);
    // Pre-selects the first saved vehicle and reports string + id.
    strict_1.default.match(src, /current\.onChange\(savedVehicleInfo\(list\[0\]\), list\[0\]\.id\)/);
    // "Other vehicle…" reveals free text; a way back exists.
    strict_1.default.match(src, /OTHER_VEHICLE_VALUE/);
    strict_1.default.equal(vehicles_1.OTHER_VEHICLE_VALUE, "__other__");
    strict_1.default.match(src, /savedOptionLabel/);
    // Fallback: a failed/empty fetch resolves to the text field.
    strict_1.default.match(src, /list = \[\]/);
    strict_1.default.match(src, /setMode\("text"\)/);
    // A parent-held value/id wins over auto-selection (scan prefill).
    strict_1.default.match(src, /current\.value\.trim\(\)\.length > 0/);
    // Loading stand-in: the wrong control never flashes.
    strict_1.default.match(src, /aria-busy="true"/);
});
(0, node_test_1.test)("picker: diagnose page renders the picker and sends the vehicle id", () => {
    const src = read("app/app/diagnose/page.tsx");
    strict_1.default.match(src, /<SavedVehicleField/);
    strict_1.default.match(src, /id="diag-vehicle"/);
    strict_1.default.match(src, /vehicleId: vehicleId \?\? undefined/);
    // A scan handoff's picked vehicle survives into this page's state.
    strict_1.default.match(src, /typeof prefill\.vehicleId === "string"\) setVehicleId\(prefill\.vehicleId\)/);
});
(0, node_test_1.test)("picker: scan photo + code fields render the picker and hand the id through", () => {
    const src = read("app/app/scan/page.tsx");
    strict_1.default.equal(src.split("<SavedVehicleField").length - 1, 2);
    strict_1.default.match(src, /id="scan-photo-vehicle"/);
    strict_1.default.match(src, /id="scan-code-vehicle"/);
    strict_1.default.match(src, /photoVehicleId \?\? undefined/);
    strict_1.default.match(src, /codeVehicleId \?\? undefined/);
    // The picker's two strings are dictionary-driven on this page.
    strict_1.default.match(src, /s\.vehicleOtherOption/);
    strict_1.default.match(src, /s\.vehicleSavedOption/);
});
(0, node_test_1.test)("picker: scan prefill builders carry the vehicle id only when given", () => {
    const photo = (0, scan_1.buildPhotoDiagnosisPrefill)([{ name: "Check engine", severity: "Moderate — Fix Soon", meaning: "…" }], "2015 Toyota Corolla", "veh-corolla");
    strict_1.default.equal(photo.vehicleId, "veh-corolla");
    strict_1.default.equal(photo.vehicleInfo, "2015 Toyota Corolla");
    const code = (0, scan_1.buildCodeDiagnosisPrefill)("P0420", "2015 Toyota Corolla", "veh-corolla");
    strict_1.default.equal(code.vehicleId, "veh-corolla");
    const bare = (0, scan_1.buildCodeDiagnosisPrefill)("P0420", "2015 Toyota Corolla");
    strict_1.default.equal(bare.vehicleId, undefined);
});
/* ------------------------ (b) link on save ------------------------ */
const DRIVER = {
    name: "Picker Tester",
    email: "picker@example.com",
    phone: "(617) 555-0177",
    password: "correct horse battery",
};
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
(0, node_test_1.test)("link on save: a picked vehicle lands on the saved record, id + string", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, {
        user,
        request: { problem: "Grinding when I brake", vehicleInfo: "2015 Toyota Corolla LE (1.8L 4-cylinder)" },
        vehicleId: "veh-corolla",
    }));
    strict_1.default.equal(events.filter((e) => e.type === "done").length, 1);
    strict_1.default.equal(store.diagnoses.length, 1);
    const saved = store.diagnoses[0];
    strict_1.default.equal(saved.vehicleId, "veh-corolla");
    strict_1.default.equal(saved.vehicleInfo, "2015 Toyota Corolla LE (1.8L 4-cylinder)");
    strict_1.default.equal(saved.userId, user.id);
    strict_1.default.equal(saved.problemText, "Grinding when I brake");
});
(0, node_test_1.test)("link on save: a free-text run is STILL saved — unlinked, with its string", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: { problem: "Rattle at idle", vehicleInfo: "2015 Toyota Corolla" } }));
    // Before Pass 15 this run saved NOTHING (no vehicleId → no record).
    strict_1.default.equal(store.diagnoses.length, 1);
    strict_1.default.equal(store.diagnoses[0].vehicleId, null);
    strict_1.default.equal(store.diagnoses[0].vehicleInfo, "2015 Toyota Corolla");
});
(0, node_test_1.test)("link on save: a cache-hit run saves its record too", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    const request = { problem: "Same squeal again", vehicleInfo: "2015 Toyota Corolla" };
    await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request, vehicleId: "veh-corolla" }));
    const second = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request, vehicleId: "veh-corolla" }));
    const done = second.find((e) => e.type === "done");
    strict_1.default.equal(done.source, "cache");
    strict_1.default.equal(provider.calls.length, 1, "the repeat run cost no AI call");
    strict_1.default.equal(store.diagnoses.length, 2, "both consumed runs are in history");
    strict_1.default.equal(store.diagnoses[1].vehicleId, "veh-corolla");
});
/* ----------------------- (c) vault history ------------------------ */
function summary(partial) {
    return {
        id: "diag-x",
        userId: "user-a",
        vehicleId: null,
        vehicleInfo: null,
        problemText: null,
        imageUrl: null,
        aiResult: { severity: "Minor — Monitor" },
        createdAt: "2026-11-16T12:00:00.000Z",
        ...partial,
    };
}
(0, node_test_1.test)("vault match: year+make+model, case-insensitive, trimmed, suffix-tolerant", () => {
    const vehicle = { year: "2015", make: "Toyota", model: "Corolla" };
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("2015 Toyota Corolla", vehicle), true);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("  2015   toyota   COROLLA ", vehicle), true);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("2015 Toyota Corolla LE", vehicle), true);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("2015 Toyota Corolla LE (1.8L 4-cylinder)", vehicle), true);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("2015 Toyota Camry", vehicle), false);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("2016 Toyota Corolla", vehicle), false);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("Toyota Corolla", vehicle), false);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)("", vehicle), false);
    strict_1.default.equal((0, vehicleService_1.vehicleInfoMatchesVehicle)(null, vehicle), false);
});
(0, node_test_1.test)("vault history: linked + legacy-matched runs merge newest-first, nothing leaks", async () => {
    const store = new appStore_1.MemoryAppStore();
    const corolla = await (0, vehicleService_1.createVehicle)(store, "user-a", {
        year: 2015,
        make: "Toyota",
        model: "Corolla",
        engine: "1.8L 4-cylinder",
        mileage: 98_000,
    });
    const accord = await (0, vehicleService_1.createVehicle)(store, "user-a", {
        year: 2019,
        make: "Honda",
        model: "Accord",
        engine: "1.5L 4-cylinder",
        mileage: 62_000,
    });
    store.diagnoses.push(
    // Linked to the Corolla — always in its history.
    summary({
        id: "d-linked",
        vehicleId: corolla.id,
        vehicleInfo: "2015 Toyota Corolla LE (1.8L 4-cylinder)",
        problemText: "Linked run",
        createdAt: "2026-11-16T15:00:00.000Z",
    }), 
    // Unlinked free-text run for the same car — legacy match.
    summary({
        id: "d-legacy",
        vehicleInfo: "  2015 toyota corolla ",
        problemText: "Legacy run",
        createdAt: "2026-11-16T16:00:00.000Z",
    }), 
    // Unlinked, a different car — must NOT appear under the Corolla.
    summary({
        id: "d-other-car",
        vehicleInfo: "2019 Honda Accord",
        problemText: "Accord run",
        createdAt: "2026-11-16T17:00:00.000Z",
    }), 
    // Linked to the Accord — must NOT appear under the Corolla.
    summary({
        id: "d-accord",
        vehicleId: accord.id,
        vehicleInfo: "2019 Honda Accord",
        createdAt: "2026-11-16T18:00:00.000Z",
    }), 
    // Another owner's unlinked Corolla run — owner-scoped read, no leak.
    summary({
        id: "d-stranger",
        userId: "user-b",
        vehicleInfo: "2015 Toyota Corolla",
        createdAt: "2026-11-16T19:00:00.000Z",
    }));
    const detail = await (0, vehicleService_1.getVehicleDetail)(store, "user-a", corolla.id);
    strict_1.default.deepEqual(detail.diagnoses.map((d) => d.id), ["d-legacy", "d-linked"], "legacy (16:00) newest first, then the linked run (15:00)");
    const accordDetail = await (0, vehicleService_1.getVehicleDetail)(store, "user-a", accord.id);
    strict_1.default.deepEqual(accordDetail.diagnoses.map((d) => d.id), ["d-accord", "d-other-car"], "the Accord sees its linked run plus its own string-matched run");
});
/* --------------------- (d) the storage contract -------------------- */
(0, node_test_1.test)("storage: migration 0016 frees the link and adds the string column", () => {
    const sql = read("db/migrations/0016_diagnosis_vehicle_link.sql");
    strict_1.default.match(sql, /ALTER TABLE diagnostics ALTER COLUMN vehicle_id DROP NOT NULL/);
    strict_1.default.match(sql, /ADD COLUMN IF NOT EXISTS vehicle_info text/);
});
(0, node_test_1.test)("storage: the unlinked read is owner-scoped; the save writes both fields", () => {
    const appStore = read("lib/server/appStore.ts");
    strict_1.default.match(appStore, /WHERE user_id = \$1 AND vehicle_id IS NULL/);
    const identityStore = read("lib/server/store.ts");
    strict_1.default.match(identityStore, /INSERT INTO diagnostics \(user_id, vehicle_id, vehicle_info, problem_text, image_url, ai_result\)/);
    // The route drops a vehicleId that is not the driver's own.
    const route = read("app/api/diagnose/route.ts");
    strict_1.default.match(route, /vehicle\.ownerId !== user\.id\) vehicleId = undefined/);
});
