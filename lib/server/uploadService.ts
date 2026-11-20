import { ValidationError } from "./authService";
import { UploadTooLargeError } from "./errors";
import { businessLogoUrl, type AppStore } from "./appStore";

/**
 * Listing photo uploads (owner order, 2026-11-16: "I want these to be
 * upload pictures. Not link.") — the /sell guided-photo set takes real
 * photo FILES now. The file is stored under the seller's account and
 * the listing keeps a URL exactly like it always did: the photo's
 * serving path, /api/listings/photos/<id>. Old listings (pasted links)
 * and every display surface are untouched — a URL is a URL.
 *
 * Rules, mirroring the dashboard scan's photo discipline:
 *   - image types only (JPEG / PNG / WebP — what phone cameras and
 *     photo pickers produce),
 *   - 5 MB cap (the legacy app's diagnosis-image cap),
 *   - the ROUTE gates the caller (signed-in driver, requireAuth)
 *     before a byte is stored — this service validates the file.
 */

export const MAX_LISTING_PHOTO_BYTES = 5 * 1024 * 1024;
export const LISTING_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function listingPhotoUrl(uploadId: string): string {
  return `/api/listings/photos/${uploadId}`;
}

export interface StoredListingPhoto {
  id: string;
  url: string;
  contentType: string;
  size: number;
}

export async function storeListingPhoto(
  store: AppStore,
  ownerId: string,
  file: { contentType: string; data: Buffer },
): Promise<StoredListingPhoto> {
  if (!file.data || file.data.length === 0) {
    throw new ValidationError("Attach a photo file.");
  }
  if (!LISTING_PHOTO_TYPES.has(file.contentType)) {
    throw new ValidationError("Please use a JPEG, PNG, or WebP photo.");
  }
  if (file.data.length > MAX_LISTING_PHOTO_BYTES) {
    throw new UploadTooLargeError(MAX_LISTING_PHOTO_BYTES);
  }
  const saved = await store.saveUpload({
    ownerId,
    contentType: file.contentType,
    data: file.data,
  });
  return {
    id: saved.id,
    url: listingPhotoUrl(saved.id),
    contentType: saved.contentType,
    size: saved.data.length,
  };
}

// ---------------------------------------------------------------------------
// Business logos (0021) — a shop/towing company's profile photo.
// Same file discipline as listing photos (JPEG/PNG/WebP, 5 MB); the
// ROUTE gates the caller (a signed-in business acting on its OWN
// profile — the id always comes from the session token, never the
// request). One logo per business: storing a new one replaces the
// old bytes; removing clears the profile pointer and deletes them.
// The logo is OPTIONAL by the owner's word — nothing here is ever
// required at registration.
// ---------------------------------------------------------------------------

export interface StoredBusinessLogo {
  id: string;
  url: string;
  contentType: string;
  size: number;
}

export async function storeBusinessLogo(
  store: AppStore,
  business: { id: string; kind: "shop" | "towing" },
  file: { contentType: string; data: Buffer },
): Promise<StoredBusinessLogo> {
  if (!file.data || file.data.length === 0) {
    throw new ValidationError("Attach a photo file.");
  }
  if (!LISTING_PHOTO_TYPES.has(file.contentType)) {
    throw new ValidationError("Please use a JPEG, PNG, or WebP photo.");
  }
  if (file.data.length > MAX_LISTING_PHOTO_BYTES) {
    throw new UploadTooLargeError(MAX_LISTING_PHOTO_BYTES);
  }
  const current =
    business.kind === "shop"
      ? await store.findShopProfileById(business.id)
      : await store.findTowingProfileById(business.id);
  if (!current) throw new ValidationError("Business account not found.");
  // Captured BEFORE the profile update — some stores hand back the
  // live record, which the update is about to mutate.
  const previousLogoId = current.logoUploadId;
  const saved = await store.saveBusinessUpload({
    businessId: business.id,
    businessKind: business.kind,
    role: "logo",
    contentType: file.contentType,
    data: file.data,
  });
  if (business.kind === "shop") {
    await store.updateShopProfile(business.id, { logoUploadId: saved.id });
  } else {
    await store.updateTowingProfile(business.id, { logoUploadId: saved.id });
  }
  if (previousLogoId && previousLogoId !== saved.id) {
    await store.deleteBusinessUpload(previousLogoId);
  }
  return {
    id: saved.id,
    url: businessLogoUrl(saved.id),
    contentType: saved.contentType,
    size: saved.data.length,
  };
}

export async function removeBusinessLogo(
  store: AppStore,
  business: { id: string; kind: "shop" | "towing" },
): Promise<void> {
  const current =
    business.kind === "shop"
      ? await store.findShopProfileById(business.id)
      : await store.findTowingProfileById(business.id);
  if (!current) throw new ValidationError("Business account not found.");
  const logoId = current.logoUploadId;
  if (!logoId) return;
  if (business.kind === "shop") {
    await store.updateShopProfile(business.id, { logoUploadId: null });
  } else {
    await store.updateTowingProfile(business.id, { logoUploadId: null });
  }
  await store.deleteBusinessUpload(logoId);
}

// ---------------------------------------------------------------------------
// Business GALLERY (0021) — up to 4 photos of the shop (storefront,
// bays, team), shown on the public profile page. Uploads only, same
// file rules; all optional, exactly like the logo.
// ---------------------------------------------------------------------------

export const MAX_BUSINESS_GALLERY_PHOTOS = 4;

function checkPhotoFile(file: { contentType: string; data: Buffer }): void {
  if (!file.data || file.data.length === 0) {
    throw new ValidationError("Attach a photo file.");
  }
  if (!LISTING_PHOTO_TYPES.has(file.contentType)) {
    throw new ValidationError("Please use a JPEG, PNG, or WebP photo.");
  }
  if (file.data.length > MAX_LISTING_PHOTO_BYTES) {
    throw new UploadTooLargeError(MAX_LISTING_PHOTO_BYTES);
  }
}

export async function storeBusinessGalleryPhoto(
  store: AppStore,
  business: { id: string; kind: "shop" | "towing" },
  file: { contentType: string; data: Buffer },
): Promise<StoredBusinessLogo> {
  checkPhotoFile(file);
  const current =
    business.kind === "shop"
      ? await store.findShopProfileById(business.id)
      : await store.findTowingProfileById(business.id);
  if (!current) throw new ValidationError("Business account not found.");
  const gallery = await store.listBusinessGallery(business.id);
  if (gallery.length >= MAX_BUSINESS_GALLERY_PHOTOS) {
    throw new ValidationError(
      `A gallery holds up to ${MAX_BUSINESS_GALLERY_PHOTOS} photos — remove one first.`,
    );
  }
  const saved = await store.saveBusinessUpload({
    businessId: business.id,
    businessKind: business.kind,
    role: "gallery",
    contentType: file.contentType,
    data: file.data,
  });
  return {
    id: saved.id,
    url: businessLogoUrl(saved.id),
    contentType: saved.contentType,
    size: saved.data.length,
  };
}

export async function removeBusinessGalleryPhoto(
  store: AppStore,
  business: { id: string; kind: "shop" | "towing" },
  uploadId: string,
): Promise<void> {
  const upload = await store.getBusinessUpload(uploadId);
  // Only the OWNING business can remove its own gallery photo —
  // anything else is simply "not found" from the caller's side.
  if (!upload || upload.businessId !== business.id || upload.role !== "gallery") {
    throw new ValidationError("That photo is not in your gallery.");
  }
  await store.deleteBusinessUpload(uploadId);
}
