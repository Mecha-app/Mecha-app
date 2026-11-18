/**
 * Pass 16 — VIN auto-fill on Add Vehicle.
 *
 * Pins:
 *   - the decode → form mapping (lib/client/vehicles): year / make /
 *     model / trim pass through, nulls become "", and the engine
 *     line is composed WITH the cylinders in the owner's format
 *     ("3.5L V6", "2.0L 4-cylinder") from the raw vPIC engine fields;
 *   - the shared AddVehicleForm carries both paths: the VIN fill
 *     (POST /api/vin/decode → vehicleFormFillFromDecode) and the
 *     manual fields saving through POST /api/vehicles;
 *   - a failed decode is a calm inline note (vinFillInvalid /
 *     vinFillUnavailable, role="status"), never the form's error
 *     alert, and nothing about the VIN state disables saving;
 *   - the vault page renders the shared form (no private copy of
 *     the old prefill), and the scan page's decode → save flow uses
 *     the same fill mapping for its engine line.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  composeEngineText,
  vehicleFormFillFromDecode,
  type VinDecodeFill,
} from "../lib/client/vehicles";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function decode(partial: Partial<VinDecodeFill>): VinDecodeFill {
  return {
    year: null,
    make: null,
    model: null,
    trim: null,
    engine: null,
    engineModel: null,
    displacementL: null,
    cylinders: null,
    engineConfiguration: null,
    ...partial,
  };
}

/** The real vPIC values for 1FTFW1ET5DFC10312 (2013 Ford F-150). */
const F150 = decode({
  year: "2013",
  make: "FORD",
  model: "F-150",
  engine: "3.5L",
  displacementL: "3.5",
  cylinders: "6",
  engineConfiguration: "V-Shaped",
});

test("composeEngineText: displacement + V layout + cylinders (the F-150 shape)", () => {
  assert.equal(composeEngineText(F150), "3.5L V6");
});

test("composeEngineText: in-line engines read as N-cylinder, model code appended", () => {
  assert.equal(
    composeEngineText(
      decode({ engine: "B46 2.0L", engineModel: "B46", displacementL: "2.0", cylinders: "4", engineConfiguration: "In-Line" }),
    ),
    "2.0L 4-cylinder B46",
  );
  // No cylinders on file: displacement + model code still compose.
  assert.equal(
    composeEngineText(decode({ engine: "B46 2.0L", engineModel: "B46", displacementL: "2.0" })),
    "2.0L B46",
  );
});

test("composeEngineText: falls back to the decoder's engine string, then to empty", () => {
  assert.equal(composeEngineText(decode({ engine: "5.0L V8" })), "5.0L V8");
  assert.equal(composeEngineText(decode({})), "");
});

test("vehicleFormFillFromDecode: identity fields pass through, nulls become empty", () => {
  assert.deepEqual(vehicleFormFillFromDecode(F150), {
    year: "2013",
    make: "FORD",
    model: "F-150",
    trim: "",
    engine: "3.5L V6",
  });
  assert.deepEqual(vehicleFormFillFromDecode(decode({ year: "2020", make: "BMW", model: "330i", trim: "330i" })), {
    year: "2020",
    make: "BMW",
    model: "330i",
    trim: "330i",
    engine: "",
  });
});

test("AddVehicleForm: VIN path fills through the shared mapping; manual path saves as before", () => {
  const form = read("app/app/vault/AddVehicleForm.tsx");
  assert.ok(form.includes("vehicleFormFillFromDecode"), "the fill goes through the shared mapping");
  assert.ok(form.includes('"/api/vin/decode"'), "the VIN search posts to the existing decode route");
  assert.ok(form.includes('"/api/vehicles"'), "saving still posts to the vehicles route");
  assert.ok(form.includes("v.prefillFromVin"), "the search button carries the catalog label");
  assert.ok(form.includes("v.vinFillHint"), "the two paths are explained in one hint line");
  assert.ok(form.includes("v.prefilledNote"), "a successful fill says so and asks for a review");
  // The required manual fields stay required — the manual path is
  // the same form, unchanged.
  for (const field of ["veh-year", "veh-mileage", "veh-make", "veh-model", "veh-engine"]) {
    assert.ok(form.includes(`id="${field}"`), `manual field ${field} still present`);
  }
});

test("AddVehicleForm: a failed decode is a calm note and never blocks saving", () => {
  const form = read("app/app/vault/AddVehicleForm.tsx");
  assert.ok(form.includes("v.vinFillInvalid"), "an unreadable VIN gets its own honest note");
  assert.ok(form.includes("v.vinFillUnavailable"), "a silent lookup gets its own honest note");
  assert.ok(form.includes('role="status"'), "the VIN note is a status, not an alarm");
  // The submit button is never disabled by the VIN machinery.
  const submit = form.slice(form.indexOf('type="submit"') - 200, form.indexOf('type="submit"'));
  assert.ok(!submit.includes("disabled"), "the save button carries no disabled state");
  assert.ok(!form.includes("disabled={vinNote"), "the VIN note state disables nothing");
});

test("vault page renders the shared form; scan save uses the same engine fill", () => {
  const vault = read("app/app/vault/page.tsx");
  assert.ok(vault.includes("<AddVehicleForm"), "the vault renders the shared AddVehicleForm");
  assert.ok(!vault.includes("onPrefillFromVin"), "the page's private prefill copy is gone");
  assert.ok(!vault.includes('id="veh-vin"'), "the page no longer defines its own VIN field");

  const scan = read("app/app/scan/page.tsx");
  assert.ok(
    scan.includes("vehicleFormFillFromDecode(res.data.enrichment).engine"),
    "the scan page's decode → save flow fills its engine through the same mapping",
  );
});
