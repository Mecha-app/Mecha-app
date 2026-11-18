"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Listing photo UPLOAD tests — the owner's order (2026-11-16):
 * "I want these to be upload pictures. Not link."
 *
 * Run: npm test. Everything runs against the in-memory AppStore:
 * NO real database, NO network — by design. What is pinned here:
 *   (a) the upload route is account-gated exactly like listing
 *       creation itself — requireAuth(["driver"]) runs BEFORE any
 *       storage (source contract on the route + the gate matrix);
 *       anonymous → 401, shop account → 403, driver passes;
 *   (b) the upload service refuses what a listing photo may not be:
 *       an empty file, a non-image type (400), and an oversize file
 *       (UploadTooLargeError → 413 at the route's error mapping);
 *   (c) a valid photo stores under the seller's account and comes
 *       back byte-for-byte, at the URL shape listings have always
 *       carried (/api/listings/photos/<id>);
 *   (d) end to end: photos uploaded through the service publish on a
 *       real listing through the unchanged createListing flow and
 *       show up in public browse with their uploaded URLs;
 *   (e) the /sell page contract: the guided slots are file-upload
 *       tiles (type="file", accept="image/*", POST to the upload
 *       route) — the pasted-link inputs are GONE.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "listing-upload-test-secret";
const appStore_1 = require("../lib/server/appStore");
const authService_1 = require("../lib/server/authService");
const errors_1 = require("../lib/server/errors");
const jwt_1 = require("../lib/server/jwt");
const listingService_1 = require("../lib/server/listingService");
const routeAuth_1 = require("../lib/server/routeAuth");
const store_1 = require("../lib/server/store");
const authService_2 = require("../lib/server/authService");
const uploadService_1 = require("../lib/server/uploadService");
const SELLER_INPUT = {
    name: "Upload Tester",
    email: "uploader@example.com",
    phone: "(617) 555-0142",
    password: "correct horse battery",
};
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 5, 6, 7, 8]);
function req(token) {
    return new Request("http://test.invalid/api/listings/photos", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
    });
}
async function makeSeller() {
    const identity = new store_1.MemoryIdentityStore();
    await (0, authService_2.registerDriver)(identity, SELLER_INPUT);
    const seller = await identity.findUserByEmail(SELLER_INPUT.email);
    strict_1.default.ok(seller);
    return { identity, seller };
}
/* ---------- (a) the route's account gate ---------- */
(0, node_test_1.test)("upload gate: anonymous → 401, shop → 403, signed-in driver passes", async () => {
    const { seller } = await makeSeller();
    const anon = (0, routeAuth_1.requireAuth)(req(), ["driver"]);
    strict_1.default.ok("response" in anon && anon.response.status === 401, "anonymous upload refused");
    const shop = (0, routeAuth_1.requireAuth)(req((0, jwt_1.signToken)({ id: seller.id, type: "shop" })), ["driver"]);
    strict_1.default.ok("response" in shop && shop.response.status === 403, "shop account refused");
    const driver = (0, routeAuth_1.requireAuth)(req((0, jwt_1.signToken)({ id: seller.id, type: "driver" })), ["driver"]);
    strict_1.default.ok("payload" in driver, "signed-in driver passes the upload gate");
    if ("payload" in driver)
        strict_1.default.equal(driver.payload.id, seller.id);
});
(0, node_test_1.test)("upload route wiring: the driver gate runs before any storage", () => {
    const src = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), "app/api/listings/photos/route.ts"), "utf8");
    const gateAt = src.indexOf('requireAuth(request, ["driver"])');
    const storeAt = src.indexOf("storeListingPhoto(");
    strict_1.default.ok(gateAt >= 0, "route must run requireAuth(['driver'])");
    strict_1.default.ok(storeAt > gateAt, "storage happens only after the gate");
    const serve = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), "app/api/listings/photos/[id]/route.ts"), "utf8");
    strict_1.default.ok(serve.includes("getUpload(id)"), "serving route reads the stored upload");
});
/* ---------- (b) file validation ---------- */
(0, node_test_1.test)("upload rejects a non-image file", async () => {
    const store = new appStore_1.MemoryAppStore();
    const { seller } = await makeSeller();
    await strict_1.default.rejects((0, uploadService_1.storeListingPhoto)(store, seller.id, {
        contentType: "application/pdf",
        data: Buffer.from("%PDF-1.4 fake"),
    }), (err) => err instanceof authService_1.ValidationError);
    strict_1.default.equal(store.uploads.size, 0, "a rejected file stores nothing");
});
(0, node_test_1.test)("upload rejects an empty file", async () => {
    const store = new appStore_1.MemoryAppStore();
    const { seller } = await makeSeller();
    await strict_1.default.rejects((0, uploadService_1.storeListingPhoto)(store, seller.id, { contentType: "image/jpeg", data: Buffer.alloc(0) }), (err) => err instanceof authService_1.ValidationError);
    strict_1.default.equal(store.uploads.size, 0);
});
(0, node_test_1.test)("upload rejects an oversize photo (over the 5 MB cap)", async () => {
    const store = new appStore_1.MemoryAppStore();
    const { seller } = await makeSeller();
    const big = Buffer.alloc(uploadService_1.MAX_LISTING_PHOTO_BYTES + 1, 0x61);
    await strict_1.default.rejects((0, uploadService_1.storeListingPhoto)(store, seller.id, { contentType: "image/jpeg", data: big }), (err) => err instanceof errors_1.UploadTooLargeError);
    strict_1.default.equal(store.uploads.size, 0, "an oversize file stores nothing");
});
/* ---------- (c) storage round-trip ---------- */
(0, node_test_1.test)("upload stores the photo under the seller and serves it back byte-for-byte", async () => {
    const store = new appStore_1.MemoryAppStore();
    const { seller } = await makeSeller();
    const stored = await (0, uploadService_1.storeListingPhoto)(store, seller.id, {
        contentType: "image/jpeg",
        data: JPEG,
    });
    strict_1.default.equal(stored.url, (0, uploadService_1.listingPhotoUrl)(stored.id));
    strict_1.default.ok(stored.url.startsWith("/api/listings/photos/"));
    strict_1.default.equal(stored.contentType, "image/jpeg");
    strict_1.default.equal(stored.size, JPEG.length);
    const back = await store.getUpload(stored.id);
    strict_1.default.ok(back);
    strict_1.default.equal(back.ownerId, seller.id);
    strict_1.default.equal(back.contentType, "image/jpeg");
    strict_1.default.ok(back.data.equals(JPEG), "bytes round-trip exactly");
    strict_1.default.equal(await store.getUpload("no-such-photo"), null);
});
/* ---------- (d) publish with uploaded photos ---------- */
(0, node_test_1.test)("listing publishes with uploaded photo URLs and browses with them", async () => {
    const appStore = new appStore_1.MemoryAppStore();
    const { seller } = await makeSeller();
    const slots = ["front", "back", "right", "interior"];
    const images = [];
    for (const slot of slots) {
        const stored = await (0, uploadService_1.storeListingPhoto)(appStore, seller.id, {
            contentType: "image/png",
            data: PNG,
        });
        images.push({ url: stored.url, slot });
    }
    const listing = await (0, listingService_1.createListing)(appStore, seller, {
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
        images,
    });
    strict_1.default.equal(listing.images.length, 4);
    strict_1.default.deepEqual(listing.images.map((p) => p.url), images.map((p) => p.url), "the listing carries the uploaded photo URLs, slots intact");
    strict_1.default.deepEqual(listing.images.map((p) => p.slot), [...slots]);
    const browse = await (0, listingService_1.searchPublicListings)(appStore, {});
    strict_1.default.equal(browse.count, 1);
    strict_1.default.equal(browse.results[0].images[0].url, images[0].url);
});
/* ---------- (e) the /sell page contract ---------- */
(0, node_test_1.test)("sell page: guided slots are upload tiles — the link inputs are gone", () => {
    const src = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), "app/sell/page.tsx"), "utf8");
    strict_1.default.ok(src.includes('type="file"'), "slots pick a real file");
    strict_1.default.ok(src.includes('accept="image/*"'), "the picker is images-only, camera-friendly");
    strict_1.default.ok(src.includes('"/api/listings/photos"'), "tiles POST to the upload route");
    strict_1.default.ok(!src.includes("photoUrlPlaceholder"), "no pasted-link input remains");
    strict_1.default.ok(!src.includes("Photo link"), "no link prompt remains");
});
