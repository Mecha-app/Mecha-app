"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LISTING_PHOTO_TYPES = exports.MAX_LISTING_PHOTO_BYTES = void 0;
exports.listingPhotoUrl = listingPhotoUrl;
exports.storeListingPhoto = storeListingPhoto;
const authService_1 = require("./authService");
const errors_1 = require("./errors");
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
exports.MAX_LISTING_PHOTO_BYTES = 5 * 1024 * 1024;
exports.LISTING_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
function listingPhotoUrl(uploadId) {
    return `/api/listings/photos/${uploadId}`;
}
async function storeListingPhoto(store, ownerId, file) {
    if (!file.data || file.data.length === 0) {
        throw new authService_1.ValidationError("Attach a photo file.");
    }
    if (!exports.LISTING_PHOTO_TYPES.has(file.contentType)) {
        throw new authService_1.ValidationError("Please use a JPEG, PNG, or WebP photo.");
    }
    if (file.data.length > exports.MAX_LISTING_PHOTO_BYTES) {
        throw new errors_1.UploadTooLargeError(exports.MAX_LISTING_PHOTO_BYTES);
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
