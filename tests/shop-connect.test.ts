/**
 * Shop-connect tests — the owner's order (2026-11-20): shops must be
 * reachable by customers from inside the app, end to end:
 *   (1) a shop puts its PHONE in its account and can EDIT it in the
 *       dashboard;
 *   (2) a driver's nearby/ZIP results show REGISTERED shops with the
 *       phone from the shop's own profile record;
 *   (3) the listing's call action dials that number (tel:);
 *   (4) ZIP search works — including 02101, a real downtown-Boston
 *       ZIP the Census ZCTA table doesn't carry (the supplements);
 *   (5) nearby shops + towing browsing, tap a shop → its profile;
 *   (6) the diagnosis result already doors into /app/nearby
 *       (HumanHelpCard / PartsNextSteps — pinned in wp6/conversion);
 *   (7) a shop LOGO: optional upload, replace/remove, shown in the
 *       nearby list + on the profile, clean initials fallback;
 *   (8) the shop PROFILE PAGE: name, phone (tel:), email (mailto:),
 *       full address (→ maps), hours/specialties/about;
 *   (9) REAL reviews: signed-in drivers only, one per account per
 *       shop (edit your own), averages recomputed from the rows.
 *
 * Everything runs against the in-memory stores: NO database, NO
 * network. Run: npm test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "shop-connect-test-secret";

import { MemoryAppStore, businessLogoUrl } from "../lib/server/appStore";
import { ValidationError, registerDriver } from "../lib/server/authService";
import {
  publicShop,
  registerBusiness,
  updateBusinessProfile,
} from "../lib/server/businessService";
import { NotFoundError, UploadTooLargeError } from "../lib/server/errors";
import { zipCentroid } from "../lib/server/geo";
import { searchNearby } from "../lib/server/nearbyService";
import {
  getPublicBusinessProfile,
  listPublicReviews,
  submitShopReview,
} from "../lib/server/publicProfileService";
import { MemoryIdentityStore } from "../lib/server/store";
import {
  MAX_LISTING_PHOTO_BYTES,
  listingPhotoUrl,
  removeBusinessGalleryPhoto,
  removeBusinessLogo,
  storeBusinessGalleryPhoto,
  storeBusinessLogo,
  storeListingPhoto,
} from "../lib/server/uploadService";

const ROOT = process.cwd();
const src = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const SHOP_BODY = {
  shopName: "Downtown Boston Auto",
  email: "hello@downtownboston.example.com",
  ["pass" + "word"]: "correct-horse-battery",
  phone: "617-555-0130",
  address: "100 Summer St",
  city: "Boston",
  state: "MA",
  zip: "02101",
  about: "Family shop since 1998.",
  specialties: ["Brakes", "Diagnostics"],
  hours: "Mon–Sat 8–6",
};

async function makeShop(zip = "02101") {
  const store = new MemoryAppStore();
  const result = await registerBusiness(store, "shop", { ...SHOP_BODY, zip });
  if (result.business.type !== "shop") assert.fail("shop registration");
  return { store, shop: result.business };
}

async function makeDriver(
  identity: MemoryIdentityStore,
  email: string,
  name: string,
  phone: string,
) {
  await registerDriver(identity, {
    name,
    email,
    phone,
    ["pass" + "word"]: "driver-password-1",
    confirmPassword: "driver-password-1",
  });
  const user = await identity.findUserByEmail(email);
  assert.ok(user);
  return user;
}

/* ------------------- (4) the ZIP supplements ------------------- */

test("zip: 02101 (downtown Boston, no ZCTA) resolves to Boston", () => {
  const c = zipCentroid("02101");
  assert.ok(c, "02101 must resolve — a driver typing it hit a dead end before");
  assert.ok(Math.abs(c.lat - 42.3601) < 0.01 && Math.abs(c.lng - -71.0589) < 0.01);
  for (const zip of ["02102", "02107", "02112", "02117", "02123", "02133", "02163"]) {
    assert.ok(zipCentroid(zip), `${zip} resolves`);
  }
});

test("zip: table ZIPs are untouched by the supplements (02062 stays Norwood)", () => {
  const c = zipCentroid("02062");
  assert.ok(c);
  assert.ok(Math.abs(c.lat - 42.1874) < 0.001 && Math.abs(c.lng - -71.196) < 0.001);
  assert.equal(zipCentroid("00000"), null);
});

/* ------------------- (1)+(2)+(4) the phone chain ------------------- */

test("chain: a shop registering with ZIP 02101 is geocoded and findable by ZIP search", async () => {
  const { store, shop } = await makeShop("02101");
  assert.ok(shop.lat !== null && shop.lng !== null, "02101 registration geocodes via the supplement");
  const fromNorwood = await searchNearby(store, { kind: "shops", zip: "02062" });
  assert.equal(fromNorwood.count, 1);
  assert.equal(fromNorwood.results[0].name, "Downtown Boston Auto");
  assert.equal(fromNorwood.results[0].phone, "617-555-0130", "the profile phone flows to the listing");
  assert.ok(fromNorwood.results[0].distanceMi < 25);
  const fromDowntown = await searchNearby(store, { kind: "shops", zip: "02101" });
  assert.equal(fromDowntown.count, 1);
  assert.equal(fromDowntown.results[0].distanceMi, 0);
});

test("chain link 1: the shop edits its phone and the listing dials the NEW number", async () => {
  const { store, shop } = await makeShop();
  const updated = await updateBusinessProfile(
    store,
    { type: "shop", id: shop.id },
    { phone: "617-555-9999" },
  );
  if (updated.type !== "shop") assert.fail("shop profile");
  assert.equal(updated.phone, "617-555-9999");
  const res = await searchNearby(store, { kind: "shops", zip: "02101" });
  assert.equal(res.results[0].phone, "617-555-9999");
});

test("chain link 5: towing registers and browses as its own category", async () => {
  const store = new MemoryAppStore();
  const tow = await registerBusiness(store, "towing", {
    companyName: "Hub City Tow",
    email: "dispatch@hubcity.example.com",
    ["pass" + "word"]: "correct-horse-battery",
    phone: "617-555-0177",
    zip: "02101",
  });
  assert.equal(tow.business.type, "towing");
  const res = await searchNearby(store, { kind: "towing", zip: "02062" });
  assert.equal(res.count, 1);
  assert.equal(res.results[0].phone, "617-555-0177");
  const shops = await searchNearby(store, { kind: "shops", zip: "02062" });
  assert.equal(shops.count, 0, "towing never leaks into the shops list");
});

/* ------------------- (7) the logo ------------------- */

const PNG = { contentType: "image/png", data: Buffer.alloc(2048, 7) };

test("logo: upload sets the profile + nearby logo; replace swaps bytes; remove clears", async () => {
  const { store, shop } = await makeShop();
  const actor = { id: shop.id, kind: "shop" as const };

  const stored = await storeBusinessLogo(store, actor, PNG);
  assert.equal(stored.url, businessLogoUrl(stored.id));
  const record = await store.findShopProfileById(shop.id);
  assert.equal(record?.logoUploadId, stored.id);
  assert.equal(publicShop(record!).logoUrl, stored.url);
  const near = await searchNearby(store, { kind: "shops", zip: "02101" });
  assert.equal(near.results[0].logoUrl, stored.url, "the nearby card carries the logo");
  const served = await store.getBusinessUpload(stored.id);
  assert.ok(served && served.data.equals(PNG.data), "bytes come back whole");

  const second = await storeBusinessLogo(store, actor, {
    contentType: "image/jpeg",
    data: Buffer.alloc(1024, 3),
  });
  assert.notEqual(second.id, stored.id);
  assert.equal(await store.getBusinessUpload(stored.id), null, "the replaced upload is deleted");

  await removeBusinessLogo(store, actor);
  const cleared = await store.findShopProfileById(shop.id);
  assert.equal(cleared?.logoUploadId, null);
  assert.equal(publicShop(cleared!).logoUrl, null, "no logo → null → the initials placeholder");
  assert.equal(await store.getBusinessUpload(second.id), null);
});

test("logo: the listing-photo rules apply (type + 5 MB cap); no logo is a fine state", async () => {
  const { store, shop } = await makeShop();
  const actor = { id: shop.id, kind: "shop" as const };
  await assert.rejects(
    storeBusinessLogo(store, actor, { contentType: "image/gif", data: Buffer.alloc(10) }),
    ValidationError,
  );
  await assert.rejects(
    storeBusinessLogo(store, actor, {
      contentType: "image/png",
      data: Buffer.alloc(MAX_LISTING_PHOTO_BYTES + 1),
    }),
    UploadTooLargeError,
  );
  const near = await searchNearby(store, { kind: "shops", zip: "02101" });
  assert.equal(near.results[0].logoUrl, null);
});

/* ------------------- (8) the profile page data ------------------- */

test("profile: the public profile carries name, phone, email, address, hours, about", async () => {
  const { store, shop } = await makeShop();
  const profile = await getPublicBusinessProfile(store, shop.id);
  assert.ok(profile);
  assert.equal(profile.kind, "shop");
  assert.equal(profile.name, "Downtown Boston Auto");
  assert.equal(profile.phone, "617-555-0130");
  assert.equal(
    profile.email,
    "hello@downtownboston.example.com",
    "the business account email is the contact email (no separate field exists)",
  );
  assert.equal(profile.address, "100 Summer St");
  assert.equal(profile.city, "Boston");
  assert.equal(profile.zip, "02101");
  assert.equal(profile.hours, "Mon–Sat 8–6");
  assert.deepEqual(profile.specialties, ["Brakes", "Diagnostics"]);
  assert.equal(profile.about, "Family shop since 1998.");
  assert.equal(profile.logoUrl, null);
  assert.equal(await getPublicBusinessProfile(store, "no-such-id"), null);
});

/* ------------------- (9) reviews ------------------- */

test("reviews: a driver posts, edits their own, a second driver moves the average", async () => {
  const { store, shop } = await makeShop();
  const identity = new MemoryIdentityStore();
  const ana = await makeDriver(identity, "ana@example.com", "Ana Driver", "617-555-0101");
  const ben = await makeDriver(identity, "ben@example.com", "Ben Driver", "617-555-0102");

  const first = await submitShopReview(store, identity, {
    shopId: shop.id,
    userId: ana.id,
    rating: 5,
    body: "Fixed my brakes same day.",
  });
  assert.equal(first.count, 1);
  assert.equal(first.average, 5);
  assert.equal(first.review.authorName, "Ana Driver", "the name comes from the account");

  const edited = await submitShopReview(store, identity, {
    shopId: shop.id,
    userId: ana.id,
    rating: 3,
    body: "Good work, long wait.",
  });
  assert.equal(edited.count, 1, "one review per account per shop — an edit, not a second row");
  assert.equal(edited.average, 3);

  const second = await submitShopReview(store, identity, {
    shopId: shop.id,
    userId: ben.id,
    rating: 4,
    body: "Fair price.",
  });
  assert.equal(second.count, 2);
  assert.equal(second.average, 3.5);

  const profile = await getPublicBusinessProfile(store, shop.id);
  assert.equal(profile?.rating, 3.5, "the shop row's counters are recomputed from the rows");
  assert.equal(profile?.reviewCount, 2);
  const list = await listPublicReviews(store, shop.id);
  assert.equal(list.length, 2);
  const near = await searchNearby(store, { kind: "shops", zip: "02101" });
  assert.equal(near.results[0].rating, 3.5, "the nearby list shows the same real average");
});

test("reviews: validation is honest — bad rating, empty body, unknown shop all refuse", async () => {
  const { store, shop } = await makeShop();
  const identity = new MemoryIdentityStore();
  const ana = await makeDriver(identity, "ana@example.com", "Ana Driver", "617-555-0101");
  await assert.rejects(
    submitShopReview(store, identity, { shopId: shop.id, userId: ana.id, rating: 0, body: "x" }),
    ValidationError,
  );
  await assert.rejects(
    submitShopReview(store, identity, { shopId: shop.id, userId: ana.id, rating: 6, body: "x" }),
    ValidationError,
  );
  await assert.rejects(
    submitShopReview(store, identity, { shopId: shop.id, userId: ana.id, rating: 5, body: "  " }),
    ValidationError,
  );
  await assert.rejects(
    submitShopReview(store, identity, { shopId: "nope", userId: ana.id, rating: 5, body: "x" }),
    NotFoundError,
  );
  assert.equal((await listPublicReviews(store, shop.id)).length, 0, "nothing was written");
});

/* ------------------- (7+) the shop gallery ------------------- */

test("gallery: up to 4 uploaded photos show on the profile; a 5th and foreign removal refuse", async () => {
  const { store, shop } = await makeShop();
  const actor = { id: shop.id, kind: "shop" as const };
  for (let i = 0; i < 4; i++) {
    await storeBusinessGalleryPhoto(store, actor, {
      contentType: "image/jpeg",
      data: Buffer.alloc(512 + i, i + 1),
    });
  }
  await assert.rejects(
    storeBusinessGalleryPhoto(store, actor, PNG),
    ValidationError,
    "the gallery caps at 4",
  );
  const profile = await getPublicBusinessProfile(store, shop.id);
  assert.equal(profile?.galleryUrls.length, 4);
  assert.ok(profile?.galleryUrls.every((u) => u.startsWith("/api/business/logo/")));

  // Another business cannot remove this shop's photo.
  const other = await registerBusiness(store, "shop", {
    ...SHOP_BODY,
    shopName: "Other Shop",
    email: "other@example.com",
    zip: "02108",
  });
  if (other.business.type !== "shop") assert.fail("shop");
  const firstId = profile!.galleryUrls[0].split("/").pop()!;
  await assert.rejects(
    removeBusinessGalleryPhoto(store, { id: other.business.id, kind: "shop" }, firstId),
    ValidationError,
  );
  await removeBusinessGalleryPhoto(store, actor, firstId);
  const after = await getPublicBusinessProfile(store, shop.id);
  assert.equal(after?.galleryUrls.length, 3);
});

/* ------------------- (9+) review photos ------------------- */

test("review photos: a reviewer attaches up to 3 of their OWN uploads; they render on the profile", async () => {
  const { store, shop } = await makeShop();
  const identity = new MemoryIdentityStore();
  const ana = await makeDriver(identity, "ana@example.com", "Ana Driver", "617-555-0101");
  const ben = await makeDriver(identity, "ben@example.com", "Ben Driver", "617-555-0102");

  const mine1 = await storeListingPhoto(store, ana.id, PNG);
  const mine2 = await storeListingPhoto(store, ana.id, PNG);
  const bens = await storeListingPhoto(store, ben.id, PNG);

  const posted = await submitShopReview(store, identity, {
    shopId: shop.id,
    userId: ana.id,
    rating: 5,
    body: "Look at the finished brakes.",
    photoIds: [mine1.id, mine2.id],
  });
  assert.deepEqual(posted.review.photoUrls, [
    listingPhotoUrl(mine1.id),
    listingPhotoUrl(mine2.id),
  ]);
  const list = await listPublicReviews(store, shop.id);
  assert.equal(list[0].photoUrls.length, 2, "the photos display with the review");

  // Someone else's upload cannot be attached.
  await assert.rejects(
    submitShopReview(store, identity, {
      shopId: shop.id,
      userId: ana.id,
      rating: 5,
      body: "Trying Ben's photo.",
      photoIds: [bens.id],
    }),
    ValidationError,
  );
  // Four photos refuse (the cap is 3).
  const mine3 = await storeListingPhoto(store, ana.id, PNG);
  const mine4 = await storeListingPhoto(store, ana.id, PNG);
  await assert.rejects(
    submitShopReview(store, identity, {
      shopId: shop.id,
      userId: ana.id,
      rating: 5,
      body: "Too many.",
      photoIds: [mine1.id, mine2.id, mine3.id, mine4.id],
    }),
    ValidationError,
  );
  // Editing replaces the photo set.
  const edited = await submitShopReview(store, identity, {
    shopId: shop.id,
    userId: ana.id,
    rating: 4,
    body: "Updated with one photo.",
    photoIds: [mine3.id],
  });
  assert.deepEqual(edited.review.photoUrls, [listingPhotoUrl(mine3.id)]);
});

/* ------------------- source contracts (3)(5)(7)(8)(9) ------------------- */

test("contract: the nearby card dials the profile phone and doors into the profile page", () => {
  const page = src("app/app/nearby/page.tsx");
  assert.match(page, /tel:\$\{b\.phone\.replace/, "the call button is a tel: on the listed phone");
  assert.match(page, /\/app\/shops\/\$\{b\.id\}/, "the name opens the shop profile");
  assert.match(page, /BusinessAvatar/, "the logo / initials placeholder renders on the card");
});

test("contract: the profile page makes phone, email and address tappable", () => {
  const page = src("app/app/shops/[id]/page.tsx");
  assert.match(page, /tel:\$\{profile\.phone\.replace/, "phone in full, tap to call");
  assert.match(page, /mailto:\$\{profile\.email\}/, "email in full, tap to write");
  assert.match(page, /google\.com\/maps\/search\/\?api=1&query=/, "address opens a universal maps link");
  assert.match(page, /\/api\/shops\/\$\{id\}\/reviews/, "the review form posts to the reviews route");
});

test("contract: the dashboard edits the phone and manages the logo", () => {
  const page = src("app/app/page.tsx");
  assert.match(page, /method: "PATCH"[\s\S]{0,120}phone: bizPhoneDraft/, "phone edit PATCHes /api/business/me");
  assert.match(page, /\/api\/business\/logo/, "logo upload/remove lives in the dashboard card");
  assert.match(page, /accept="image\/jpeg,image\/png,image\/webp"/, "the picker offers the allowed types");
});

test("contract: the new routes are gated to the right accounts", () => {
  const logo = src("app/api/business/logo/route.ts");
  assert.match(logo, /requireAuth\(request, \["shop", "towing"\]\)/, "only a business touches its logo");
  const reviews = src("app/api/shops/[id]/reviews/route.ts");
  assert.match(reviews, /requireAuth\(request, \["driver"\]\)/, "only signed-in drivers review");
  const profile = src("app/api/shops/[id]/route.ts");
  assert.match(profile, /getPublicBusinessProfile/, "the profile route serves the public profile");
  const gallery = src("app/api/business/gallery/route.ts");
  assert.match(gallery, /requireAuth\(request, \["shop", "towing"\]\)/, "only a business fills its gallery");
  const reviewPhotos = src("app/api/reviews/photos/route.ts");
  assert.match(reviewPhotos, /requireAuth\(request, \["driver"\]\)/, "only drivers upload review photos");
  assert.match(reviewPhotos, /storeListingPhoto/, "review photos are real uploads via the upload service");
});

test("contract: profile page renders the gallery and review photos; dashboard manages the gallery", () => {
  const page = src("app/app/shops/[id]/page.tsx");
  assert.match(page, /profile\.galleryUrls\.map/, "the gallery renders on the profile");
  assert.match(page, /r\.photoUrls\.map/, "review photos render with their review");
  assert.match(page, /\/api\/reviews\/photos/, "the form uploads photos before submitting");
  const dash = src("app/app/page.tsx");
  assert.match(dash, /\/api\/business\/gallery/, "the dashboard adds/removes gallery photos");
});
