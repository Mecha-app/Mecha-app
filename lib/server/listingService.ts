import { ValidationError } from "./authService";
import { NotFoundError } from "./errors";
import { haversineMiles, normalizeZip, zipCentroid } from "./geo";
import type {
  AppStore,
  ListingPatch,
  ListingPhoto,
  ListingPhotoSlot,
  ListingRecord,
  ListingStatus,
} from "./appStore";
import type { UserRecord } from "./store";

/**
 * Marketplace listings (WP6) — validation, the guided-photo model, and
 * the listing lifecycle, shared by the /api/listings routes and the
 * test-suite.
 *
 * OWNER'S PHOTO SPEC (2026-11-03): a listing's photos form a GUIDED set —
 * named slots a buyer actually inspects a car by — with a 4-photo
 * MINIMUM. The slots:
 *   front · back · right · left · interior (dashboard/interior) · whole
 * The data shape + the minimum + the slot labels are implemented here;
 * a step-by-step guided capture flow is deliberately NOT built (the
 * owner's priority order puts the diagnostic core first — marketplace
 * depth is the later pivot, STATUS.md WP6 entry).
 *
 * PRIORITY NOTE (owner, same date): listings stay functional and clean;
 * they do not outrank diagnose / nearby / dashboard work.
 */

export const LISTING_PHOTO_SLOTS: ListingPhotoSlot[] = [
  "front",
  "back",
  "right",
  "left",
  "interior",
  "whole",
];

export const MIN_LISTING_PHOTOS = 4;
export const MAX_LISTING_PHOTOS = 12;

/**
 * Normalize raw photo input (bare URL strings, or {url, slot} objects)
 * into the stored guided shape. Unknown slots coerce to "whole" — the
 * same rule the store's reader applies to legacy rows, so a photo is
 * never silently dropped for carrying an unrecognized label.
 */
export function normalizePhotos(raw: unknown): ListingPhoto[] {
  if (!Array.isArray(raw)) return [];
  const photos: ListingPhoto[] = [];
  for (const item of raw) {
    if (photos.length >= MAX_LISTING_PHOTOS) break;
    if (typeof item === "string") {
      const url = item.trim();
      if (url) photos.push({ url, slot: "whole" });
    } else if (item && typeof item === "object") {
      const rec = item as { url?: unknown; slot?: unknown };
      if (typeof rec.url === "string" && rec.url.trim().length > 0) {
        photos.push({
          url: rec.url.trim(),
          slot: LISTING_PHOTO_SLOTS.includes(rec.slot as ListingPhotoSlot)
            ? (rec.slot as ListingPhotoSlot)
            : "whole",
        });
      }
    }
  }
  return photos;
}

function requirePhotos(raw: unknown): ListingPhoto[] {
  const photos = normalizePhotos(raw);
  for (const photo of photos) {
    if (photo.url.length > 1000 || !/^(https?:\/\/|\/)/.test(photo.url)) {
      throw new ValidationError("Each photo must be a link (https://…) or an uploaded file path.");
    }
  }
  if (photos.length < MIN_LISTING_PHOTOS) {
    throw new ValidationError(
      `A listing needs at least ${MIN_LISTING_PHOTOS} photos — front, back, one side, and the dashboard/interior are the set buyers trust.`,
    );
  }
  return photos;
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function optionalString(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanString(value, max);
}

function parsePrice(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) {
    throw new ValidationError('"price" must be an amount above 0.');
  }
  return Math.round(n * 100) / 100;
}

function parseMileage(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 3_000_000) {
    throw new ValidationError('"mileage" must be a number between 0 and 3,000,000.');
  }
  return Math.round(n);
}

function parseZip(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const zip = normalizeZip(value);
  if (!zip) throw new ValidationError('"zip" must be a 5-digit ZIP code.');
  return zip;
}

const LISTING_STATUSES: ListingStatus[] = ["active", "sold", "removed"];

export async function createListing(
  store: AppStore,
  seller: UserRecord,
  body: Record<string, unknown>,
): Promise<ListingRecord> {
  const title = cleanString(body.title, 140);
  const make = cleanString(body.make, 80);
  const model = cleanString(body.model, 80);
  const description = cleanString(body.description, 4000);
  const city = cleanString(body.city, 80);
  const state = cleanString(body.state, 80);
  if (!title) throw new ValidationError('A non-empty "title" is required.');
  if (!make) throw new ValidationError('A non-empty "make" is required.');
  if (!model) throw new ValidationError('A non-empty "model" is required.');
  if (!description) throw new ValidationError('A non-empty "description" is required.');
  if (!city) throw new ValidationError('A non-empty "city" is required.');
  if (!state) throw new ValidationError('A non-empty "state" is required.');
  const year =
    typeof body.year === "number" ? String(body.year) : cleanString(body.year, 4);
  if (!year || !/^(19|20)\d{2}$/.test(year)) {
    throw new ValidationError('"year" must be a 4-digit year.');
  }
  return store.createListing({
    sellerId: seller.id,
    sellerName: seller.name,
    sellerEmail: seller.email,
    title,
    year,
    make,
    model,
    trim: optionalString(body.trim, 80),
    mileage: parseMileage(body.mileage),
    price: parsePrice(body.price),
    titleStatus: optionalString(body.titleStatus, 40) ?? "Clean Title",
    condition: optionalString(body.condition, 40) ?? "Good",
    color: optionalString(body.color, 40),
    transmission: optionalString(body.transmission, 40) ?? "Automatic",
    drivetrain: optionalString(body.drivetrain, 40) ?? "FWD",
    engine: optionalString(body.engine, 80),
    description,
    knownProblems: optionalString(body.knownProblems, 2000),
    phone: optionalString(body.phone, 40),
    city,
    state,
    zip: parseZip(body.zip),
    images: requirePhotos(body.images),
  });
}

export async function updateListingForSeller(
  store: AppStore,
  sellerId: string,
  listingId: string,
  body: Record<string, unknown>,
): Promise<ListingRecord> {
  const patch: ListingPatch = {};
  if (body.title !== undefined) {
    const title = cleanString(body.title, 140);
    if (!title) throw new ValidationError('A non-empty "title" is required.');
    patch.title = title;
  }
  if (body.description !== undefined) {
    const description = cleanString(body.description, 4000);
    if (!description) throw new ValidationError('A non-empty "description" is required.');
    patch.description = description;
  }
  if (body.price !== undefined) patch.price = parsePrice(body.price);
  if (body.mileage !== undefined) patch.mileage = parseMileage(body.mileage);
  if (body.city !== undefined) {
    const city = cleanString(body.city, 80);
    if (!city) throw new ValidationError('A non-empty "city" is required.');
    patch.city = city;
  }
  if (body.state !== undefined) {
    const state = cleanString(body.state, 80);
    if (!state) throw new ValidationError('A non-empty "state" is required.');
    patch.state = state;
  }
  if (body.zip !== undefined) patch.zip = parseZip(body.zip);
  if (body.trim !== undefined) patch.trim = optionalString(body.trim, 80);
  if (body.color !== undefined) patch.color = optionalString(body.color, 40);
  if (body.engine !== undefined) patch.engine = optionalString(body.engine, 80);
  if (body.knownProblems !== undefined) patch.knownProblems = optionalString(body.knownProblems, 2000);
  if (body.phone !== undefined) patch.phone = optionalString(body.phone, 40);
  if (body.titleStatus !== undefined) patch.titleStatus = optionalString(body.titleStatus, 40) ?? "Clean Title";
  if (body.condition !== undefined) patch.condition = optionalString(body.condition, 40) ?? "Good";
  if (body.transmission !== undefined) patch.transmission = optionalString(body.transmission, 40) ?? "Automatic";
  if (body.drivetrain !== undefined) patch.drivetrain = optionalString(body.drivetrain, 40) ?? "FWD";
  if (body.images !== undefined) patch.images = requirePhotos(body.images);
  if (body.status !== undefined) {
    if (!LISTING_STATUSES.includes(body.status as ListingStatus)) {
      throw new ValidationError('"status" must be active, sold, or removed.');
    }
    patch.status = body.status as ListingStatus;
  }
  const updated = await store.updateListing(listingId, sellerId, patch);
  if (!updated) throw new NotFoundError("Listing not found.");
  return updated;
}

export async function deleteListingForSeller(
  store: AppStore,
  sellerId: string,
  listingId: string,
): Promise<void> {
  const deleted = await store.deleteListing(listingId, sellerId);
  if (!deleted) throw new NotFoundError("Listing not found.");
}

export interface PublicListing extends ListingRecord {
  distanceMi: number | null;
}

export interface ListingSearchResult {
  count: number;
  results: PublicListing[];
  originZip: string | null;
}

/**
 * Public browse + search. Plain browse returns the newest active
 * listings. A ZIP search locates the buyer and ranks by true distance
 * from each listing's ZIP centroid (listings without a ZIP cannot be
 * located and sit out a ZIP search — they still appear in plain
 * browse). Candidate volume is bounded (newest 500 active) — at beta
 * scale that is the whole marketplace; the bound is stated here so a
 * later package can move the filter into SQL knowingly.
 */
export async function searchPublicListings(
  store: AppStore,
  input: { zip?: unknown; query?: unknown; radiusMi?: unknown },
): Promise<ListingSearchResult> {
  const active = await store.listActiveListings(500);
  const query = typeof input.query === "string" ? input.query.trim().toLowerCase() : "";
  let results: PublicListing[] = active.map((l) => ({ ...l, distanceMi: null }));

  if (query) {
    results = results.filter((l) =>
      `${l.title} ${l.year} ${l.make} ${l.model} ${l.trim ?? ""} ${l.city} ${l.state}`
        .toLowerCase()
        .includes(query),
    );
  }

  const zip = input.zip === undefined || input.zip === "" ? null : normalizeZip(input.zip);
  if (input.zip !== undefined && input.zip !== "" && !zip) {
    throw new ValidationError('"zip" must be a 5-digit ZIP code.');
  }
  if (zip) {
    const origin = zipCentroid(zip);
    if (!origin) {
      throw new ValidationError("That ZIP code isn't in our table yet — try browsing without it.");
    }
    const radiusRaw = typeof input.radiusMi === "number" ? input.radiusMi : Number(input.radiusMi);
    const radiusMi = Number.isFinite(radiusRaw) ? Math.min(500, Math.max(1, radiusRaw)) : 100;
    results = results
      .map((l) => {
        const centroid = l.zip ? zipCentroid(l.zip) : null;
        return { ...l, distanceMi: centroid ? haversineMiles(origin, centroid) : null };
      })
      .filter((l) => l.distanceMi !== null && (l.distanceMi as number) <= radiusMi)
      .sort((a, b) => (a.distanceMi as number) - (b.distanceMi as number));
  }

  return { count: results.length, results, originZip: zip };
}
