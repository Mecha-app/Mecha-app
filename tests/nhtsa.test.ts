/**
 * NHTSA public-data tests.
 *
 * The network is replaced with fixtures in NHTSA's published response
 * shapes (vPIC DecodeVinValues, Recalls, Complaints, SafetyRatings):
 * no real government call is made. These tests pin the module
 * contract the vehicle flows rely on — full factory-spec decode,
 * recalls/complaints/ratings parsing, "Not Rated" handling, the
 * in-process cache, and the rule that every NHTSA failure degrades
 * to null instead of breaking the owner's request.
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
      OverallFrontalCrashRating: "4",
      FrontalCrashDriversideRating: "5",
      FrontalCrashPassengersideRating: "4",
      OverallSideCrashRating: "5",
      SideCrashDriversideRating: "5",
      SideCrashPassengersideRating: "5",
      RolloverRating: "5",
    },
  ],
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
    reset({ "Recalls/vehicle": { body: RECALLS_BODY } });
    const recalls = await fetchRecalls({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(recalls);
    assert.equal(recalls.length, 1);
    assert.equal(recalls[0].campaignNumber, "24V123000");
    assert.equal(recalls[0].component, "ENGINE");
    assert.equal(recalls[0].remedy, "Dealers will update the software.");

    reset({ "Recalls/vehicle": { body: { Count: 0, results: [] } } });
    assert.deepEqual(await fetchRecalls({ make: "BMW", model: "330i", year: "2020" }), []);

    reset({ "Recalls/vehicle": "throw" });
    assert.equal(await fetchRecalls({ make: "BMW", model: "330i", year: "2020" }), null);
  } finally {
    restoreFetch();
  }
});

test("fetchComplaints: total count, top components by frequency, newest first", async () => {
  reset({ "Complaints/vehicle": { body: COMPLAINTS_BODY } });
  try {
    const complaints = await fetchComplaints({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(complaints);
    assert.equal(complaints.count, 42);
    assert.deepEqual(complaints.topComponents, ["ENGINE", "ELECTRICAL SYSTEM"]);
    assert.equal(complaints.recent.length, 3);
    assert.equal(complaints.recent[0].filedAt, "2024-06-15");
    assert.equal(complaints.recent[0].component, "ELECTRICAL SYSTEM");
    assert.equal(complaints.recent[2].filedAt, "2023-03-01");
  } finally {
    restoreFetch();
  }
});

test("fetchComplaints: outage degrades to null; zero complaints is a real answer", async () => {
  try {
    reset({ "Complaints/vehicle": "throw" });
    assert.equal(await fetchComplaints({ make: "BMW", model: "330i", year: "2020" }), null);
    reset({ "Complaints/vehicle": { body: { count: 0, results: [] } } });
    const none = await fetchComplaints({ make: "BMW", model: "330i", year: "2020" });
    assert.ok(none);
    assert.equal(none.count, 0);
    assert.deepEqual(none.recent, []);
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
              OverallFrontalCrashRating: "Not Rated",
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
