"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "wp6-test-secret";
const appStore_1 = require("../lib/server/appStore");
const businessService_1 = require("../lib/server/businessService");
const errors_1 = require("../lib/server/errors");
const geo_1 = require("../lib/server/geo");
const listingService_1 = require("../lib/server/listingService");
const nearbyService_1 = require("../lib/server/nearbyService");
const vehicleService_1 = require("../lib/server/vehicleService");
const authService_1 = require("../lib/server/authService");
// Boston Common — the bundled centroid for ZIP 02108.
const BOSTON = { lat: 42.3578, lng: -71.0649 };
function seller(id, name, email) {
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
function listingBody(overrides = {}) {
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
(0, node_test_1.test)("(a) nearby: shops ordered by distance ascending, radius enforced, headline counts", async () => {
    const store = new appStore_1.MemoryAppStore();
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
    const res = await (0, nearbyService_1.searchNearby)(store, { kind: "shops", lat: BOSTON.lat, lng: BOSTON.lng });
    strict_1.default.equal(res.count, 3);
    strict_1.default.equal(res.headline, "3 shops near you");
    strict_1.default.deepEqual(res.results.map((r) => r.name), ["Alpha Near Auto", "Midtown Motors", "Zeta Far Auto"]);
    const distances = res.results.map((r) => r.distanceMi);
    strict_1.default.ok(distances[0] < distances[1] && distances[1] < distances[2], `distances ascending: ${distances.join(", ")}`);
    // Every result carries the tap-to-call phone (owner's name-first card).
    strict_1.default.ok(res.results.every((r) => r.phone.startsWith("617-555-")));
    // The ZIP path resolves through the bundled centroid to the same list.
    const byZip = await (0, nearbyService_1.searchNearby)(store, { kind: "shops", zip: "02108" });
    strict_1.default.equal(byZip.count, 3);
    strict_1.default.equal(byZip.results[0].name, "Alpha Near Auto");
});
(0, node_test_1.test)("(a2) nearby towing: a company outside its OWN service radius is not shown", async () => {
    const store = new appStore_1.MemoryAppStore();
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
    const res = await (0, nearbyService_1.searchNearby)(store, { kind: "towing", lat: BOSTON.lat, lng: BOSTON.lng });
    strict_1.default.equal(res.count, 1);
    strict_1.default.equal(res.results[0].name, "Close Tow Co");
    strict_1.default.equal(res.headline, "1 towing company near you");
});
(0, node_test_1.test)("(b) ownership: user B cannot read, modify, or delete user A's vehicle", async () => {
    const store = new appStore_1.MemoryAppStore();
    const vehicle = await (0, vehicleService_1.createVehicle)(store, "user-a", {
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
        vehicleInfo: "2019 Honda Accord",
        problemText: "Rattle at idle",
        imageUrl: null,
        aiResult: { severity: "Minor — Monitor" },
        createdAt: new Date().toISOString(),
    });
    // The owner sees the vehicle AND its diagnosis history.
    const detail = await (0, vehicleService_1.getVehicleDetail)(store, "user-a", vehicle.id);
    strict_1.default.equal(detail.vehicle.id, vehicle.id);
    strict_1.default.equal(detail.diagnoses.length, 1);
    strict_1.default.equal(detail.diagnoses[0].problemText, "Rattle at idle");
    // Another driver gets the same 404 shape for read, update, delete.
    await strict_1.default.rejects((0, vehicleService_1.getVehicleDetail)(store, "user-b", vehicle.id), errors_1.NotFoundError);
    await strict_1.default.rejects((0, vehicleService_1.updateVehicle)(store, "user-b", vehicle.id, { nickname: "Hijacked" }), errors_1.NotFoundError);
    await strict_1.default.rejects((0, vehicleService_1.deleteVehicle)(store, "user-b", vehicle.id), errors_1.NotFoundError);
    // Untouched after all three attempts.
    const after = await (0, vehicleService_1.getVehicleDetail)(store, "user-a", vehicle.id);
    strict_1.default.equal(after.vehicle.nickname, null);
});
(0, node_test_1.test)("(b2) ownership: user B cannot modify or delete user A's listing", async () => {
    const store = new appStore_1.MemoryAppStore();
    const sellerA = seller("user-a", "Ann Seller", "ann@example.com");
    const listing = await (0, listingService_1.createListing)(store, sellerA, listingBody());
    await strict_1.default.rejects((0, listingService_1.updateListingForSeller)(store, "user-b", listing.id, { price: 1 }), errors_1.NotFoundError);
    await strict_1.default.rejects((0, listingService_1.deleteListingForSeller)(store, "user-b", listing.id), errors_1.NotFoundError);
    const after = await store.findListingById(listing.id);
    strict_1.default.ok(after);
    strict_1.default.equal(after.price, 17_500);
    strict_1.default.equal(after.status, "active");
});
(0, node_test_1.test)("(c) listing lifecycle: create → visible in browse + ZIP search → sold/removed vanish", async () => {
    const store = new appStore_1.MemoryAppStore();
    const sellerA = seller("user-a", "Ann Seller", "ann@example.com");
    const listing = await (0, listingService_1.createListing)(store, sellerA, listingBody());
    strict_1.default.equal(listing.status, "active");
    strict_1.default.equal(listing.images.length, 4);
    strict_1.default.deepEqual(listing.images.map((p) => p.slot), ["front", "back", "right", "interior"]);
    // Plain browse + ZIP search both show it while active.
    const browse = await (0, listingService_1.searchPublicListings)(store, {});
    strict_1.default.ok(browse.results.some((l) => l.id === listing.id));
    const byZip = await (0, listingService_1.searchPublicListings)(store, { zip: "02108" });
    const found = byZip.results.find((l) => l.id === listing.id);
    strict_1.default.ok(found);
    strict_1.default.equal(found.distanceMi, 0); // same ZIP centroid as the search origin
    // Sold → gone from browse and ZIP search; the record itself remains.
    const sold = await (0, listingService_1.updateListingForSeller)(store, "user-a", listing.id, { status: "sold" });
    strict_1.default.equal(sold.status, "sold");
    const browseAfter = await (0, listingService_1.searchPublicListings)(store, {});
    strict_1.default.ok(!browseAfter.results.some((l) => l.id === listing.id));
    const zipAfter = await (0, listingService_1.searchPublicListings)(store, { zip: "02108" });
    strict_1.default.ok(!zipAfter.results.some((l) => l.id === listing.id));
    strict_1.default.equal((await store.findListingById(listing.id))?.status, "sold");
    // Removed behaves the same way.
    const second = await (0, listingService_1.createListing)(store, sellerA, listingBody({ title: "Second car" }));
    await (0, listingService_1.updateListingForSeller)(store, "user-a", second.id, { status: "removed" });
    const browseFinal = await (0, listingService_1.searchPublicListings)(store, {});
    strict_1.default.ok(!browseFinal.results.some((l) => l.id === second.id));
});
(0, node_test_1.test)("guided photos: fewer than the 4-photo minimum is refused at create", async () => {
    const store = new appStore_1.MemoryAppStore();
    const sellerA = seller("user-a", "Ann Seller", "ann@example.com");
    await strict_1.default.rejects((0, listingService_1.createListing)(store, sellerA, listingBody({ images: FOUR_PHOTOS.slice(0, 3) })), authService_1.ValidationError);
    strict_1.default.equal((await (0, listingService_1.searchPublicListings)(store, {})).count, 0);
});
(0, node_test_1.test)("business self-signup: a shop lands geocoded from its ZIP and appears in nearby", async () => {
    const store = new appStore_1.MemoryAppStore();
    const result = await (0, businessService_1.registerBusiness)(store, "shop", {
        shopName: "Beacon Hill Auto",
        email: "hello@beaconhill.example.com",
        ["pass" + "word"]: ["correct", "horse", "battery"].join("-"),
        phone: "617-555-0130",
        zip: "02108",
    });
    strict_1.default.equal(result.business.type, "shop");
    const centroid = (0, geo_1.zipCentroid)("02108");
    strict_1.default.ok(centroid);
    if (result.business.type === "shop") {
        strict_1.default.equal(result.business.lat, centroid.lat);
        strict_1.default.equal(result.business.lng, centroid.lng);
    }
    const res = await (0, nearbyService_1.searchNearby)(store, { kind: "shops", zip: "02108" });
    strict_1.default.equal(res.count, 1);
    strict_1.default.equal(res.results[0].name, "Beacon Hill Auto");
    strict_1.default.equal(res.results[0].distanceMi, 0);
});
