import { ValidationError } from "./authService";
import { businessLogoUrl, type AppStore, type ShopReviewRecord } from "./appStore";
import { NotFoundError } from "./errors";
import type { IdentityStore } from "./store";
import { listingPhotoUrl } from "./uploadService";

/**
 * The public SHOP PROFILE (owner order 2026-11-20) — "kind of like a
 * Facebook page" for a shop: what a driver sees when they tap a shop
 * in the nearby/ZIP/towing results. Everything on it comes from the
 * business's own profile record — the name, the phone drivers call,
 * the account email (the profile has no separate contact-email
 * field; the business account's email IS the contact email), the
 * full address, hours, specialties, about, its logo, and its REAL
 * reviews (0022 — written only by signed-in drivers; the average and
 * count are the shop row's counters, recomputed from the review rows
 * on every write).
 *
 * Public like /api/nearby: the same facts the nearby list already
 * shows, on one page. Inactive businesses don't get a page.
 */

export interface PublicProfileReview {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  /** Serving paths of the reviewer's uploaded photos (0015). */
  photoUrls: string[];
  createdAt: string;
}

export interface PublicBusinessProfile {
  id: string;
  kind: "shop" | "towing";
  name: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  about: string | null;
  specialties: string[];
  languages: string[];
  hours: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  logoUrl: string | null;
  /** Serving paths of the gallery photos (0021), oldest first. */
  galleryUrls: string[];
  serviceRadiusMi: number | null;
}

function toPublicReview(r: ShopReviewRecord): PublicProfileReview {
  return {
    id: r.id,
    authorName: r.authorName,
    rating: r.rating,
    body: r.body,
    photoUrls: r.photoIds.map((id) => listingPhotoUrl(id)),
    createdAt: r.createdAt,
  };
}

export async function getPublicBusinessProfile(
  store: AppStore,
  id: string,
): Promise<PublicBusinessProfile | null> {
  const galleryUrls = (await store.listBusinessGallery(id)).map((u) =>
    businessLogoUrl(u.id),
  );
  const shop = await store.findShopProfileById(id);
  if (shop && shop.isActive) {
    return {
      id: shop.id,
      kind: "shop",
      name: shop.shopName,
      phone: shop.phone,
      email: shop.email,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      zip: shop.zip,
      about: shop.about,
      specialties: shop.specialties,
      languages: shop.languages,
      hours: shop.hours,
      rating: shop.rating,
      reviewCount: shop.reviewCount,
      isVerified: shop.isVerified,
      logoUrl: shop.logoUploadId ? businessLogoUrl(shop.logoUploadId) : null,
      galleryUrls,
      serviceRadiusMi: null,
    };
  }
  const towing = await store.findTowingProfileById(id);
  if (towing && towing.isActive) {
    return {
      id: towing.id,
      kind: "towing",
      name: towing.companyName,
      phone: towing.phone,
      email: towing.email,
      address: null,
      city: null,
      state: null,
      zip: towing.zip,
      about: null,
      specialties: [],
      languages: [],
      hours: null,
      rating: towing.rating,
      // Reviews are a shops-only system (0022); a towing profile
      // honestly shows none.
      reviewCount: 0,
      isVerified: towing.isVerified,
      logoUrl: towing.logoUploadId ? businessLogoUrl(towing.logoUploadId) : null,
      galleryUrls,
      serviceRadiusMi: towing.serviceRadiusMi,
    };
  }
  return null;
}

export async function listPublicReviews(
  store: AppStore,
  shopId: string,
  limit = 20,
): Promise<PublicProfileReview[]> {
  const rows = await store.listShopReviews(shopId, limit);
  return rows.map(toPublicReview);
}

export const MAX_REVIEW_BODY = 1000;
export const MAX_REVIEW_PHOTOS = 3;

/**
 * Submit (or edit) the caller's review of a shop. The honesty rules
 * are structural: the author id comes from the session token, the
 * name from the account record, the store keeps one row per
 * (shop, account) — there is no other write path, and shops have no
 * way to touch reviews of themselves. Photos are the reviewer's OWN
 * uploads (0015): ids are verified against the upload records and
 * their owner before anything is written.
 */
export async function submitShopReview(
  store: AppStore,
  identity: IdentityStore,
  input: {
    shopId: string;
    userId: string;
    rating: unknown;
    body: unknown;
    photoIds?: unknown;
  },
): Promise<{ review: PublicProfileReview; average: number; count: number }> {
  const shop = await store.findShopProfileById(input.shopId);
  if (!shop || !shop.isActive) throw new NotFoundError("That shop does not exist.");
  const rating = typeof input.rating === "number" ? input.rating : Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError("Pick a star rating from 1 to 5.");
  }
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (body.length === 0) throw new ValidationError("Write a few words about the shop.");
  if (body.length > MAX_REVIEW_BODY) {
    throw new ValidationError(`Keep the review under ${MAX_REVIEW_BODY} characters.`);
  }
  const photoIds: string[] = [];
  if (input.photoIds !== undefined) {
    if (!Array.isArray(input.photoIds)) {
      throw new ValidationError("Photos must be uploaded files, not links.");
    }
    for (const raw of input.photoIds) {
      if (typeof raw === "string" && raw.length > 0 && !photoIds.includes(raw)) {
        photoIds.push(raw);
      }
    }
    if (photoIds.length > MAX_REVIEW_PHOTOS) {
      throw new ValidationError(`Up to ${MAX_REVIEW_PHOTOS} photos per review.`);
    }
    for (const photoId of photoIds) {
      const upload = await store.getUpload(photoId);
      if (!upload || upload.ownerId !== input.userId) {
        throw new ValidationError("Attach photos you uploaded yourself.");
      }
    }
  }
  const user = await identity.findUserById(input.userId);
  const authorName = user?.name?.trim() ? user.name.trim() : "MECHA driver";
  const { review, aggregate } = await store.upsertShopReview({
    shopId: input.shopId,
    userId: input.userId,
    authorName,
    rating,
    body,
    photoIds,
  });
  return { review: toPublicReview(review), average: aggregate.average, count: aggregate.count };
}
