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
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "listing-upload-test-secret";

import { MemoryAppStore } from "../lib/server/appStore";
import { ValidationError } from "../lib/server/authService";
import { UploadTooLargeError } from "../lib/server/errors";
import { signToken } from "../lib/server/jwt";
import { createListing, searchPublicListings } from "../lib/server/listingService";
import { requireAuth } from "../lib/server/routeAuth";
import { MemoryIdentityStore } from "../lib/server/store";
import { registerDriver } from "../lib/server/authService";
import {
  MAX_LISTING_PHOTO_BYTES,
  listingPhotoUrl,
  storeListingPhoto,
} from "../lib/server/uploadService";
import type { UserRecord } from "../lib/server/store";

const SELLER_INPUT = {
  name: "Upload Tester",
  email: "uploader@example.com",
  phone: "(617) 555-0142",
  password: "correct horse battery",
};

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 5, 6, 7, 8]);

function req(token?: string): Request {
  return new Request("http://test.invalid/api/listings/photos", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

async function makeSeller(): Promise<{ identity: MemoryIdentityStore; seller: UserRecord }> {
  const identity = new MemoryIdentityStore();
  await registerDriver(identity, SELLER_INPUT);
  const seller = await identity.findUserByEmail(SELLER_INPUT.email);
  assert.ok(seller);
  return { identity, seller };
}

/* ---------- (a) the route's account gate ---------- */

test("upload gate: anonymous → 401, shop → 403, signed-in driver passes", async () => {
  const { seller } = await makeSeller();

  const anon = requireAuth(req(), ["driver"]);
  assert.ok("response" in anon && anon.response.status === 401, "anonymous upload refused");

  const shop = requireAuth(req(signToken({ id: seller.id, type: "shop" })), ["driver"]);
  assert.ok("response" in shop && shop.response.status === 403, "shop account refused");

  const driver = requireAuth(req(signToken({ id: seller.id, type: "driver" })), ["driver"]);
  assert.ok("payload" in driver, "signed-in driver passes the upload gate");
  if ("payload" in driver) assert.equal(driver.payload.id, seller.id);
});

test("upload route wiring: the driver gate runs before any storage", () => {
  const src = readFileSync(
    join(process.cwd(), "app/api/listings/photos/route.ts"),
    "utf8",
  );
  const gateAt = src.indexOf('requireAuth(request, ["driver"])');
  const storeAt = src.indexOf("storeListingPhoto(");
  assert.ok(gateAt >= 0, "route must run requireAuth(['driver'])");
  assert.ok(storeAt > gateAt, "storage happens only after the gate");
  const serve = readFileSync(
    join(process.cwd(), "app/api/listings/photos/[id]/route.ts"),
    "utf8",
  );
  assert.ok(serve.includes("getUpload(id)"), "serving route reads the stored upload");
});

/* ---------- (b) file validation ---------- */

test("upload rejects a non-image file", async () => {
  const store = new MemoryAppStore();
  const { seller } = await makeSeller();
  await assert.rejects(
    storeListingPhoto(store, seller.id, {
      contentType: "application/pdf",
      data: Buffer.from("%PDF-1.4 fake"),
    }),
    (err: unknown) => err instanceof ValidationError,
  );
  assert.equal(store.uploads.size, 0, "a rejected file stores nothing");
});

test("upload rejects an empty file", async () => {
  const store = new MemoryAppStore();
  const { seller } = await makeSeller();
  await assert.rejects(
    storeListingPhoto(store, seller.id, { contentType: "image/jpeg", data: Buffer.alloc(0) }),
    (err: unknown) => err instanceof ValidationError,
  );
  assert.equal(store.uploads.size, 0);
});

test("upload rejects an oversize photo (over the 5 MB cap)", async () => {
  const store = new MemoryAppStore();
  const { seller } = await makeSeller();
  const big = Buffer.alloc(MAX_LISTING_PHOTO_BYTES + 1, 0x61);
  await assert.rejects(
    storeListingPhoto(store, seller.id, { contentType: "image/jpeg", data: big }),
    (err: unknown) => err instanceof UploadTooLargeError,
  );
  assert.equal(store.uploads.size, 0, "an oversize file stores nothing");
});

/* ---------- (c) storage round-trip ---------- */

test("upload stores the photo under the seller and serves it back byte-for-byte", async () => {
  const store = new MemoryAppStore();
  const { seller } = await makeSeller();
  const stored = await storeListingPhoto(store, seller.id, {
    contentType: "image/jpeg",
    data: JPEG,
  });
  assert.equal(stored.url, listingPhotoUrl(stored.id));
  assert.ok(stored.url.startsWith("/api/listings/photos/"));
  assert.equal(stored.contentType, "image/jpeg");
  assert.equal(stored.size, JPEG.length);

  const back = await store.getUpload(stored.id);
  assert.ok(back);
  assert.equal(back.ownerId, seller.id);
  assert.equal(back.contentType, "image/jpeg");
  assert.ok(back.data.equals(JPEG), "bytes round-trip exactly");

  assert.equal(await store.getUpload("no-such-photo"), null);
});

/* ---------- (d) publish with uploaded photos ---------- */

test("listing publishes with uploaded photo URLs and browses with them", async () => {
  const appStore = new MemoryAppStore();
  const { seller } = await makeSeller();

  const slots = ["front", "back", "right", "interior"] as const;
  const images = [];
  for (const slot of slots) {
    const stored = await storeListingPhoto(appStore, seller.id, {
      contentType: "image/png",
      data: PNG,
    });
    images.push({ url: stored.url, slot });
  }

  const listing = await createListing(appStore, seller, {
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
  assert.equal(listing.images.length, 4);
  assert.deepEqual(
    listing.images.map((p) => p.url),
    images.map((p) => p.url),
    "the listing carries the uploaded photo URLs, slots intact",
  );
  assert.deepEqual(
    listing.images.map((p) => p.slot),
    [...slots],
  );

  const browse = await searchPublicListings(appStore, {});
  assert.equal(browse.count, 1);
  assert.equal(browse.results[0].images[0].url, images[0].url);
});

/* ---------- (e) the /sell page contract ---------- */

test("sell page: guided slots are upload tiles — the link inputs are gone", () => {
  const src = readFileSync(join(process.cwd(), "app/sell/page.tsx"), "utf8");
  assert.ok(src.includes('type="file"'), "slots pick a real file");
  assert.ok(src.includes('accept="image/*"'), "the picker is images-only, camera-friendly");
  assert.ok(src.includes('"/api/listings/photos"'), "tiles POST to the upload route");
  assert.ok(!src.includes("photoUrlPlaceholder"), "no pasted-link input remains");
  assert.ok(!src.includes("Photo link"), "no link prompt remains");
});
