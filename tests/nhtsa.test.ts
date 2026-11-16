/**
 * NHTSA public-data tests.
 *
 * The network is replaced with fixtures in the response shapes of
 * NHTSA's CURRENT api.nhtsa.gov endpoints (the old webapi.nhtsa.gov
 * host/paths are retired). The SafetyRatings and F-150 fixtures below
 * are trimmed copies of LIVE responses captured 2026-11-16 (Honda
 * Accord 2003 variants + VehicleId 4738 detail; Ford F-150 2013
 * model list, SUPER CREW variants + VehicleId 7342 detail, SUPER
 * CREW complaints) — including the real field names
 * (OverallFrontCrashRating / FrontCrashDriversideRating, NOT the
 * "Frontal…" names an earlier invented fixture set used) and the
 * live quirks: recalls/complaints answer a no-match query with
 * HTTP 400 + an empty success body, and variant-filed vehicles
 * (F-150) have no data under the bare vPIC model name. These tests
 * pin the module contract the vehicle flows rely on — full
 * factory-spec decode, recalls/complaints/ratings parsing,
 * "Not Rated" handling, the in-process cache, and the rule that
 * every NHTSA failure degrades to null instead of breaking the
 * owner's request.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clearNhtsaCache,
  decodeVin,
  fetchComplaints,
  fetchRecalls,
  fetchSafetyRatings,
} from "../lib/server/nhtsa";

const fetchCalls: string[] = [];
const originalFetch = globalThis.fetch;

type Fixture = { status?: number; body?: unknown } | "throw";

function installFetch(routes: Record<string, Fixture>): void {
  fetchCalls.length = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
    fetchCalls.push(url);
    for (const [needle, fixture] of Object.entries(routes)) {
      if (!url.includes(needle)) continue;
      if (fixture === "throw") throw new Error("network down");
      const { status = 200, body } = fixture as { status?: number; body?: unknown };
      return new Response(JSON.stringify(body ?? {}), {
        status,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 404 });
  };
}

function restoreFetch(): void {
  (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
}

function reset(routes: Record<string, Fixture>): void {
  clearNhtsaCache();
  installFetch(routes);
}

const VIN = "WBA5R1C58KAK09542";

const VPIC_BODY = {
  Count: 1,
  Results: [
    {
      ModelYear: "2020",
      Make: "BMW",
      Model: "330i",
      Trim: "330i",
      EngineModel: "B46",
      DisplacementL: "2.0",
      BodyClass: "Sedan/Saloon",
      DriveType: "RWD",
      TransmissionStyle: "Automatic",
      TransmissionSpeeds: "8",
      FuelTypePrimary: "Gasoline",
      Doors: "4",
      PlantCity: "Munich",
      PlantState: "",
      PlantCountry: "Germany",
      Manufacturer: "BMW AG",
      ErrorCode: "0",
    },
  ],
};

const RECALLS_BODY = {
  Count: 1,
  results: [
    {
      NHTSACampaignNumber: "24V123000",
      Component: "ENGINE",
      Summary: "The engine may stall.",
      Consequence: "A stall increases crash risk.",
      Remedy: "Dealers will update the software.",
      ReportReceivedDate: "01/15/2024",
    },
  ],
};

const COMPLAINTS_BODY = {
  count: 42,
  results: [
    { components: "ENGINE", summary: "Engine stalled at highway speed.", dateComplaintFiled: "2023-03-01" },
    { components: "ELECTRICAL SYSTEM", summary: "Battery died twice.", dateComplaintFiled: "2024-06-15" },
    { components: "ENGINE", summary: "Rough idle and stall.", dateComplaintFiled: "2022-01-20" },
    { components: "ENGINE", summary: "Check engine light, loss of power.", dateComplaintFiled: "2024-01-05" },
  ],
};

const VARIANTS_BODY = {
  Count: 1,
  Results: [{ VehicleDescription: "2020 BMW 330i 4 DR RWD", VehicleId: 11463 }],
};

const RATINGS_BODY = {
  Count: 1,
  Results: [
    {
      VehicleDescription: "2020 BMW 330i 4 DR RWD",
      OverallRating: "5",
      // Real field names from the live API — "Frontal…" does not exist.
      OverallFrontCrashRating: "4",
      FrontCrashDriversideRating: "5",
      FrontCrashPassengersideRating: "4",
      OverallSideCrashRating: "5",
      SideCrashDriversideRating: "5",
      SideCrashPassengersideRating: "5",
      RolloverRating: "5",
    },
  ],
};

/** Live capture 2026-11-16: Honda Accord 2003 variants, first listed. */
const HONDA_VARIANTS_BODY = {
  Count: 4,
  Message: "Results returned successfully",
  Results: [
    { VehicleDescription: "2003 Honda Accord 2-DR. w/SAB", VehicleId: 4739 },
    { VehicleDescription: "2003 Honda Accord 4-DR. w/SAB", VehicleId: 4738 },
    { VehicleDescription: "2003 Honda Accord 4-DR.", VehicleId: 4737 },
    { VehicleDescription: "2003 Honda Accord 2-DR.", VehicleId: 4736 },
  ],
};

/** Live capture 2026-11-16: VehicleId 4738 detail (trimmed to rating fields). */
const HONDA_DETAIL_BODY = {
  Count: 1,
  Message: "Results returned successfully",
  Results: [
    {
      VehicleDescription: "2003 Honda Accord 4-DR. w/SAB",
      OverallRating: "Not Rated",
      OverallFrontCrashRating: "Not Rated",
      FrontCrashDriversideRating: "5",
      FrontCrashPassengersideRating: "5",
      OverallSideCrashRating: "Not Rated",
      SideCrashDriversideRating: "Not Rated",
      SideCrashPassengersideRating: "Not Rated",
      RolloverRating: "Not Rated",
      VehicleId: 4738,
    },
  ],
};

/** Live capture 2026-11-16: Ford 2013 model list (trimmed to the relevant rows). */
const FORD_MODELS_BODY = {
  Count: 29,
  Message: "Results returned successfully",
  Results: [
    { ModelYear: 2013, Make: "FORD", Model: "EDGE", VehicleId: 0 },
    { ModelYear: 2013, Make: "FORD", Model: "ESCAPE", VehicleId: 0 },
    { ModelYear: 2013, Make: "FORD", Model: "EXPLORER", VehicleId: 0 },
    { ModelYear: 2013, Make: "FORD", Model: "F-150 REGULAR CAB", VehicleId: 0 },
    { ModelYear: 2013, Make: "FORD", Model: "F-150 SUPER CREW", VehicleId: 0 },
    { ModelYear: 2013, Make: "FORD", Model: "F-150 SUPERCAB", VehicleId: 0 },
  ],
};

/** Live capture 2026-11-16: F-150 SUPER CREW variants (first listed: 7342). */
const SUPERCREW_VARIANTS_BODY = {
  Count: 2,
  Message: "Results returned successfully",
  Results: [
    { VehicleDescription: "2013 Ford F-150 Super Crew PU/CC 4x2", VehicleId: 7342 },
    { VehicleDescription: "2013 Ford F-150 Super Crew PU/CC 4x4", VehicleId: 7341 },
  ],
};

/** Live capture 2026-11-16: VehicleId 7342 detail (trimmed to rating fields). */
const SUPERCREW_DETAIL_BODY = {
  Count: 1,
  Message: "Results returned successfully",
  Results: [
    {
      VehicleDescription: "2013 Ford F-150 Super Crew PU/CC 4x2",
      OverallRating: "4",
      OverallFrontCrashRating: "3",
      FrontCrashDriversideRating: "4",
      FrontCrashPassengersideRating: "3",
      OverallSideCrashRating: "5",
      SideCrashDriversideRating: "5",
      SideCrashPassengersideRating: "5",
      RolloverRating: "4",
      VehicleId: 7342,
    },
  ],
};

/** Live capture 2026-11-16: F-150 SUPER CREW complaints (2 of 2796 rows, summaries trimmed). */
const SUPERCREW_COMPLAINTS_BODY = {
  count: 2796,
  message: "Results returned successfully",
  results: [
    {
      odiNumber: 11679124,
      dateComplaintFiled: "08/07/2025",
      components: "ENGINE",
      summary: "Truck has 91,200 miles and was well maintained. Truck has a loud rattle.",
    },
    {
      odiNumber: 11679190,
      dateComplaintFiled: "08/07/2025",
      components: "POWER TRAIN",
      summary: "At about [XXX], Tuesday, I was N/B, my speed was approximately 6",
    },
  ],
};

/** The live API's no-match answer: HTTP 400 + an empty success body. */
const EMPTY_RESULT_400 = {
  status: 400,
  body: { Count: 0, Message: "Results returned successfully", results: [] },
};

test("decodeVin: full factory spec set, composed engine/transmission/plant", async () => {
  reset({ decodevinvalues: { body: VPIC_BODY } });
  try {
    const decoded = await decodeVin(VIN);
    assert.ok(decoded);
    assert.equal(decoded.year, "2020");
    assert.equal(decoded.make, "BMW");
    assert.equal(decoded.model, "330i");
    assert.equal(decoded.engine, "B46 2.0L");
    assert.equal(decoded.bodyClass, "Sedan/Saloon");
    assert.equal(decoded.driveType, "RWD");
    assert.equal(decoded.transmission, "Automatic, 8-speed");
    assert.equal(decoded.fuelType, "Gasoline");
    assert.equal(decoded.doors, "4");
    // Empty PlantState drops out of the composed plant string.
    assert.equal(decoded.plant, "Munich, Germany");
    assert.equal(decoded.manufacturer, "BMW AG");
    assert.equal(decoded.errorCode, "0");
    assert.ok(fetchCalls[0].includes("vpic.nhtsa.dot.gov"));
  } finally {
    restoreFetch();
  }
});

test("decodeVin: NHTSA down, non-200, or empty result all degrade to null", async () => {
  try {
    reset({ decodevinvalues: "throw" });
    assert.equal(await decodeVin(VIN), null);
    reset({ decodevinvalues: { status: 503, body: {} } });
    assert.equal(await decodeVin(VIN), null);
    reset({ decodevinvalues: { body: { Count: 0, Results: [] } } });
    assert.equal(await decodeVin(VIN), null);
  } finally {
    restoreFetch();
  }
});

test("cache: a second decode of the same VIN does not re-hit NHTSA; failures are not cached", async () => {
  try {
    reset({ decodevinvalues: { body: VPIC_BODY } });
    await decodeVin(VIN);
    await decodeVin(VIN);
    assert.equal(fetchCalls.length, 1);
    // A failure must not pin "no data": after an outage the next
    // call retries and succeeds.
    reset({ decodevinvalues: "throw" });
    assert.equal(await decodeVin("1HGCV1F34KA000001"), null);
    installFetch({ decodevinvalues: { body: VPIC_BODY } });
    assert.ok(await decodeVin("1HGCV1F34KA000001"));
  } finally {
    restoreFetch();
  }
});

test("fetchRecalls: maps the campaign fields; empty set is [], outage is null", async () => {
  try {
    reset({ "recalls/recallsByVehicle": { body: RECALLS_BODY } });
    const recalls = await fetchRecalls({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(recalls);
    assert.equal(recalls.length, 1);
    assert.equal(recalls[0].campaignNumber, "24V123000");
    assert.equal(recalls[0].component, "ENGINE");
    assert.equal(recalls[0].remedy, "Dealers will update the software.");
    assert.ok(fetchCalls[0].includes("api.nhtsa.gov/recalls/recallsByVehicle"));

    reset({ "recalls/recallsByVehicle": { body: { Count: 0, results: [] } } });
    assert.deepEqual(await fetchRecalls({ make: "BMW", model: "330i", year: "2020" }), []);

    reset({ "recalls/recallsByVehicle": "throw" });
    assert.equal(await fetchRecalls({ make: "BMW", model: "330i", year: "2020" }), null);
  } finally {
    restoreFetch();
  }
});

test("fetchRecalls: the API's 400-with-empty-body no-match answer is [], a real 400 is null", async () => {
  try {
    // Verified live 2026-11-16: a no-match recalls query returns
    // HTTP 400 with {"Count":0,...,"results":[]} — that is "no
    // recalls", not a failure.
    reset({ "recalls/recallsByVehicle": EMPTY_RESULT_400 });
    assert.deepEqual(await fetchRecalls({ make: "Ford", model: "NoSuchModel", year: "2013" }), []);

    reset({ "recalls/recallsByVehicle": { status: 400, body: { message: "bad request" } } });
    assert.equal(await fetchRecalls({ make: "Ford", model: "NoSuchModel", year: "2013" }), null);
  } finally {
    restoreFetch();
  }
});

test("fetchComplaints: total count, top components by frequency, newest first", async () => {
  reset({ "complaints/complaintsByVehicle": { body: COMPLAINTS_BODY } });
  try {
    const complaints = await fetchComplaints({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(complaints);
    assert.equal(complaints.count, 42);
    assert.deepEqual(complaints.topComponents, ["ENGINE", "ELECTRICAL SYSTEM"]);
    assert.equal(complaints.recent.length, 3);
    assert.equal(complaints.recent[0].filedAt, "2024-06-15");
    assert.equal(complaints.recent[0].component, "ELECTRICAL SYSTEM");
    assert.equal(complaints.recent[2].filedAt, "2023-03-01");
    // A non-empty exact answer never triggers the sibling lookup.
    assert.equal(fetchCalls.length, 1);
    assert.ok(fetchCalls[0].includes("api.nhtsa.gov/complaints/complaintsByVehicle"));
  } finally {
    restoreFetch();
  }
});

test("fetchComplaints: outage degrades to null; zero complaints is a real answer", async () => {
  try {
    reset({ "complaints/complaintsByVehicle": "throw" });
    assert.equal(await fetchComplaints({ make: "BMW", model: "330i", year: "2020" }), null);
    // Zero under the exact name AND no sibling names in the model
    // list → a genuine zero, not a failure.
    reset({
      "complaints/complaintsByVehicle": { body: { count: 0, results: [] } },
      "SafetyRatings/modelyear": {
        body: {
          Count: 2,
          Results: [
            { ModelYear: 2020, Make: "BMW", Model: "330i", VehicleId: 0 },
            { ModelYear: 2020, Make: "BMW", Model: "X5", VehicleId: 0 },
          ],
        },
      },
    });
    const none = await fetchComplaints({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(none);
    assert.equal(none.count, 0);
    assert.deepEqual(none.recent, []);
  } finally {
    restoreFetch();
  }
});

test("fetchComplaints: variant-filed vehicle merges sibling model names (live F-150 shape)", async () => {
  // Verified live 2026-11-16: bare "F-150" complaints answer the
  // 400-empty no-match shape; the complaints live under the cab
  // variants (SUPER CREW alone holds 2796). Needles are ordered
  // most-specific first — the stub takes the first match.
  reset({
    "model=F-150+SUPER+CREW": { body: SUPERCREW_COMPLAINTS_BODY },
    "model=F-150+REGULAR+CAB": EMPTY_RESULT_400,
    "model=F-150+SUPERCAB": EMPTY_RESULT_400,
    "complaints/complaintsByVehicle": EMPTY_RESULT_400,
    "SafetyRatings/modelyear/2013/make/Ford": { body: FORD_MODELS_BODY },
  });
  try {
    const complaints = await fetchComplaints({ make: "Ford", model: "F-150", year: "2013" });
    assert.ok(complaints);
    assert.equal(complaints.count, 2796);
    assert.deepEqual(complaints.topComponents, ["ENGINE", "POWER TRAIN"]);
    assert.equal(complaints.recent.length, 2);
    assert.equal(complaints.recent[0].filedAt, "08/07/2025");
    assert.ok(fetchCalls.some((url) => url.includes("model=F-150+SUPER+CREW")));
  } finally {
    restoreFetch();
  }
});

test("fetchSafetyRatings: variant lookup then star ratings by VehicleId", async () => {
  reset({ "SafetyRatings/modelyear": { body: VARIANTS_BODY }, "SafetyRatings/VehicleId": { body: RATINGS_BODY } });
  try {
    const ratings = await fetchSafetyRatings({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(ratings);
    assert.equal(ratings.vehicleDescription, "2020 BMW 330i 4 DR RWD");
    assert.equal(ratings.overall, 5);
    assert.equal(ratings.frontal, 4);
    assert.equal(ratings.frontalPassenger, 4);
    assert.equal(ratings.side, 5);
    assert.equal(ratings.rollover, 5);
    assert.equal(fetchCalls.length, 2);
    assert.ok(fetchCalls[1].includes("VehicleId/11463"));
  } finally {
    restoreFetch();
  }
});

test("fetchSafetyRatings: 'Not Rated' fields become null; a fully unrated variant is null overall", async () => {
  try {
    reset({
      "SafetyRatings/modelyear": { body: VARIANTS_BODY },
      "SafetyRatings/VehicleId": {
        body: {
          Count: 1,
          Results: [
            {
              VehicleDescription: "2020 BMW 330i 4 DR RWD",
              OverallRating: "Not Rated",
              OverallFrontCrashRating: "Not Rated",
              OverallSideCrashRating: "Not Rated",
              RolloverRating: "Not Rated",
            },
          ],
        },
      },
    });
    assert.equal(await fetchSafetyRatings({ make: "BMW", model: "330i", year: "2020" }), null);

    reset({ "SafetyRatings/modelyear": { body: { Count: 0, Results: [] } } });
    assert.equal(await fetchSafetyRatings({ make: "BMW", model: "330i", year: "2020" }), null);

    reset({ "SafetyRatings/modelyear": "throw" });
    assert.equal(await fetchSafetyRatings({ make: "BMW", model: "330i", year: "2020" }), null);
  } finally {
    restoreFetch();
  }
});

test("fetchSafetyRatings: live Honda shape — sub-scores alone do not rescue an unrated variant", async () => {
  // Real 2003 Accord data: every headline rating is "Not Rated"
  // (only the frontal sub-scores carry stars), so the variant has
  // nothing to show and the result is null.
  reset({
    "SafetyRatings/modelyear": { body: HONDA_VARIANTS_BODY },
    "SafetyRatings/VehicleId": { body: HONDA_DETAIL_BODY },
  });
  try {
    assert.equal(await fetchSafetyRatings({ make: "Honda", model: "Accord", year: "2003" }), null);
    assert.ok(fetchCalls[0].includes("api.nhtsa.gov/SafetyRatings/modelyear/2003/make/Honda/model/Accord"));
  } finally {
    restoreFetch();
  }
});

test("fetchSafetyRatings: variant-filed vehicle resolves through sibling model names (live F-150 shape)", async () => {
  // Verified live 2026-11-16: bare "F-150" has NO rated variants;
  // the walk goes model list → "F-150 SUPER CREW" → VehicleId 7342.
  // Needles are ordered most-specific first — the stub takes the
  // first match, and the model-list needle is a prefix of every
  // variant URL, so it must come last.
  reset({
    "model/F-150%20SUPER%20CREW": { body: SUPERCREW_VARIANTS_BODY },
    "model/F-150%20REGULAR%20CAB": { body: { Count: 0, Message: "Results returned successfully", Results: [] } },
    "model/F-150": { body: { Count: 0, Message: "Results returned successfully", Results: [] } },
    "SafetyRatings/VehicleId/7342": { body: SUPERCREW_DETAIL_BODY },
    "SafetyRatings/modelyear/2013/make/Ford": { body: FORD_MODELS_BODY },
  });
  try {
    const ratings = await fetchSafetyRatings({ make: "Ford", model: "F-150", year: "2013" });
    assert.ok(ratings);
    assert.equal(ratings.vehicleDescription, "2013 Ford F-150 Super Crew PU/CC 4x2");
    assert.equal(ratings.overall, 4);
    assert.equal(ratings.frontal, 3);
    assert.equal(ratings.frontalDriver, 4);
    assert.equal(ratings.frontalPassenger, 3);
    assert.equal(ratings.side, 5);
    assert.equal(ratings.rollover, 4);
    assert.ok(fetchCalls.some((url) => url.includes("model/F-150%20SUPER%20CREW")));
    assert.ok(fetchCalls.some((url) => url.includes("SafetyRatings/VehicleId/7342")));
  } finally {
    restoreFetch();
  }
});
