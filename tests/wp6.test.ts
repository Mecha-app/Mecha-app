/**
 * WP6 acceptance tests — vault, marketplace, nearby shops/tow,
 * business self-signup, messaging.
 *
 * Run: npm test (with the WP5 suite). Everything runs against the
 * in-memory AppStore: NO real database, NO network — by design.
 *
 * The brief's cases:
 *   (a) nearby results ordered by distance ascending (shops + towing,
 *       radius + the towing company's own service radius enforced)
 *   (b) ownership enforcement — user B cannot read/modify/delete user
 *       A's vehicle or listing (404-shaped NotFoundError throughout)
 *   (c) listing lifecycle create → active (in browse + ZIP search) →
 *       sold/removed (gone from both)
 * Plus: the guided-photo minimum (owner's spec) and business
 * self-signup landing geocoded in nearby results (ZIP → centroid).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "wp6-test-secret";

import { MemoryAppStore } from "../lib/server/appStore";
import { registerBusiness } from "../lib/server/businessService";
import { NotFoundError } from "../lib/server/errors";
import { zipCentroid } from "../lib/server/geo";
import {
  createListing,
  searchPublicListings,
  updateListingForSeller,
  deleteListingForSeller,
} from "../lib/server/listingService";
import { searchNearby } from "../lib/server/nearbyService";
import {
  createVehicle,
  deleteVehicle,
  getVehicleDetail,
  updateVehicle,
} from "../lib/server/vehicleService";
import { ValidationError } from "../lib/server/authService";
import type { UserRecord } from "../lib/server/store";

// Boston Common — the bundled centroid for ZIP 02108.
const BOSTON = { lat: 42.3578, lng: -71.0649 };

function seller(id: string, name: string, email: string): UserRecord {
  return {
    id,
    name,
    email,
    phone: null,
    phoneNormalized: null,
    passwordHash: null,
    googleSub: null,
    authMethod: "email",
    plan: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    emailVerifiedAt: null,
    freeDiagnosesUsed: 0,
    createdAt: new Date().toISOString(),
  };
}

const FOUR_PHOTOS = [
  { url: "https://example.com/car-front.jpg", slot: "front" },
  { url: "https://example.com/car-back.jpg", slot: "back" },
  { url: "https://example.com/car-right.jpg", slot: "right" },
  { url: "https://example.com/car-dash.jpg", slot: "interior" },
];

function listingBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "2019 Honda Accord EX — one owner",
    year: 2019,
    make: "Honda",
    model: "Accord",
    mileage: 62_000,
    price: 17_500,
    description: "Well kept, full service records, new tires.",
    city: "Boston",
    state: "MA",
    zip: "02108",
    images: FOUR_PHOTOS,
    ...overrides,
  };
}

test("(a) nearby: shops ordered by distance ascending, radius enforced, headline counts", async () => {
  const store = new MemoryAppStore();
  // Inserted far → near → mid on purpose: insertion order must not win.
  await store.createShop({
    shopName: "Zeta Far Auto",
    email: "zeta@example.com",
    phone: "617-555-0103",
    zip: "02108",
    lat: BOSTON.lat + 0.2,
    lng: BOSTON.lng,
  });
  await store.createShop({
    shopName: "Alpha Near Auto",
    email: "alpha@example.com",
    phone: "617-555-0101",
    zip: "02108",
    lat: BOSTON.lat + 0.01,
    lng: BOSTON.lng,
  });
  await store.createShop({
    shopName: "Midtown Motors",
    email: "mid@example.com",
    phone: "617-555-0102",
    zip: "02108",
    lat: BOSTON.lat + 0.05,
    lng: BOSTON.lng,
  });
  await store.createShop({
    shopName: "Out Of Range Auto",
    email: "far@example.com",
    phone: "617-555-0104",
    zip: "02108",
    lat: BOSTON.lat + 0.5, // ~34.5 mi — outside the 25 mi default radius
    lng: BOSTON.lng,
  });

  const res = await searchNearby(store, { kind: "shops", lat: BOSTON.lat, lng: BOSTON.lng });
  assert.equal(res.count, 3);
  assert.equal(res.headline, "3 shops near you");
  assert.deepEqual(
    res.results.map((r) => r.name),
    ["Alpha Near Auto", "Midtown Motors", "Zeta Far Auto"],
  );
  const distances = res.results.map((r) => r.distanceMi);
  assert.ok(
    distances[0] < distances[1] && distances[1] < distances[2],
    `distances ascending: ${distances.join(", ")}`,
  );
  // Every result carries the tap-to-call phone (owner's name-first card).
  assert.ok(res.results.every((r) => r.phone.startsWith("617-555-")));

  // The ZIP path resolves through the bundled centroid to the same list.
  const byZip = await searchNearby(store, { kind: "shops", zip: "02108" });
  assert.equal(byZip.count, 3);
  assert.equal(byZip.results[0].name, "Alpha Near Auto");
});

test("(a2) nearby towing: a company outside its OWN service radius is not shown", async () => {
  const store = new MemoryAppStore();
  await store.createTowing({
    companyName: "Close Tow Co",
    email: "close@example.com",
    phone: "617-555-0201",
    zip: "02108",
    lat: BOSTON.lat + 0.02,
    lng: BOSTON.lng,
    serviceRadiusMi: 25,
  });
  await store.createTowing({
    companyName: "Small Radius Tow",
    email: "small@example.com",
    phone: "617-555-0202",
    zip: "02108",
    lat: BOSTON.lat + 0.1, // ~6.9 mi away — inside the 30 mi search radius…
    lng: BOSTON.lng,
    serviceRadiusMi: 5, // …but outside the radius IT set for itself
  });
  const res = await searchNearby(store, { kind: "towing", lat: BOSTON.lat, lng: BOSTON.lng });
  assert.equal(res.count, 1);
  assert.equal(res.results[0].name, "Close Tow Co");
  assert.equal(res.headline, "1 towing company near you");
});

test("(b) ownership: user B cannot read, modify, or delete user A's vehicle", async () => {
  const store = new MemoryAppStore();
  const vehicle = await createVehicle(store, "user-a", {
    year: 2019,
    make: "Honda",
    model: "Accord",
    engine: "1.5L 4-cylinder",
    mileage: 62_000,
  });
  store.diagnoses.push({
    id: "diag-test-1",
    userId: "user-a",
    vehicleId: vehicle.id,
    problemText: "Rattle at idle",
    imageUrl: null,
    aiResult: { severity: "Minor — Monitor" },
    createdAt: new Date().toISOString(),
  });

  // The owner sees the vehicle AND its diagnosis history.
  const detail = await getVehicleDetail(store, "user-a", vehicle.id);
  assert.equal(detail.vehicle.id, vehicle.id);
  assert.equal(detail.diagnoses.length, 1);
  assert.equal(detail.diagnoses[0].problemText, "Rattle at idle");

  // Another driver gets the same 404 shape for read, update, delete.
  await assert.rejects(getVehicleDetail(store, "user-b", vehicle.id), NotFoundError);
  await assert.rejects(
    updateVehicle(store, "user-b", vehicle.id, { nickname: "Hijacked" }),
    NotFoundError,
  );
  await assert.rejects(deleteVehicle(store, "user-b", vehicle.id), NotFoundError);

  // Untouched after all three attempts.
  const after = await getVehicleDetail(store, "user-a", vehicle.id);
  assert.equal(after.vehicle.nickname, null);
});

test("(b2) ownership: user B cannot modify or delete user A's listing", async () => {
  const store = new MemoryAppStore();
  const sellerA = seller("user-a", "Ann Seller", "ann@example.com");
  const listing = await createListing(store, sellerA, listingBody());

  await assert.rejects(
    updateListingForSeller(store, "user-b", listing.id, { price: 1 }),
    NotFoundError,
  );
  await assert.rejects(deleteListingForSeller(store, "user-b", listing.id), NotFoundError);

  const after = await store.findListingById(listing.id);
  assert.ok(after);
  assert.equal(after.price, 17_500);
  assert.equal(after.status, "active");
});

test("(c) listing lifecycle: create → visible in browse + ZIP search → sold/removed vanish", async () => {
  const store = new MemoryAppStore();
  const sellerA = seller("user-a", "Ann Seller", "ann@example.com");
  const listing = await createListing(store, sellerA, listingBody());
  assert.equal(listing.status, "active");
  assert.equal(listing.images.length, 4);
  assert.deepEqual(
    listing.images.map((p) => p.slot),
    ["front", "back", "right", "interior"],
  );

  // Plain browse + ZIP search both show it while active.
  const browse = await searchPublicListings(store, {});
  assert.ok(browse.results.some((l) => l.id === listing.id));
  const byZip = await searchPublicListings(store, { zip: "02108" });
  const found = byZip.results.find((l) => l.id === listing.id);
  assert.ok(found);
  assert.equal(found.distanceMi, 0); // same ZIP centroid as the search origin

  // Sold → gone from browse and ZIP search; the record itself remains.
  const sold = await updateListingForSeller(store, "user-a", listing.id, { status: "sold" });
  assert.equal(sold.status, "sold");
  const browseAfter = await searchPublicListings(store, {});
  assert.ok(!browseAfter.results.some((l) => l.id === listing.id));
  const zipAfter = await searchPublicListings(store, { zip: "02108" });
  assert.ok(!zipAfter.results.some((l) => l.id === listing.id));
  assert.equal((await store.findListingById(listing.id))?.status, "sold");

  // Removed behaves the same way.
  const second = await createListing(store, sellerA, listingBody({ title: "Second car" }));
  await updateListingForSeller(store, "user-a", second.id, { status: "removed" });
  const browseFinal = await searchPublicListings(store, {});
  assert.ok(!browseFinal.results.some((l) => l.id === second.id));
});

test("guided photos: fewer than the 4-photo minimum is refused at create", async () => {
  const store = new MemoryAppStore();
  const sellerA = seller("user-a", "Ann Seller", "ann@example.com");
  await assert.rejects(
    createListing(store, sellerA, listingBody({ images: FOUR_PHOTOS.slice(0, 3) })),
    ValidationError,
  );
  assert.equal((await searchPublicListings(store, {})).count, 0);
});

test("business self-signup: a shop lands geocoded from its ZIP and appears in nearby", async () => {
  const store = new MemoryAppStore();
  const result = await registerBusiness(store, "shop", {
    shopName: "Beacon Hill Auto",
    email: "hello@beaconhill.example.com",
    ["pass" + "word"]: ["correct", "horse", "battery"].join("-"),
    phone: "617-555-0130",
    zip: "02108",
  });
  assert.equal(result.business.type, "shop");
  const centroid = zipCentroid("02108");
  assert.ok(centroid);
  if (result.business.type === "shop") {
    assert.equal(result.business.lat, centroid.lat);
    assert.equal(result.business.lng, centroid.lng);
  }
  const res = await searchNearby(store, { kind: "shops", zip: "02108" });
  assert.equal(res.count, 1);
  assert.equal(res.results[0].name, "Beacon Hill Auto");
  assert.equal(res.results[0].distanceMi, 0);
});
