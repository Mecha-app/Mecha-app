"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineMiles = haversineMiles;
exports.normalizeZip = normalizeZip;
exports.zipCentroid = zipCentroid;
exports.isValidLatLng = isValidLatLng;
exports.formatMiles = formatMiles;
const zipData_1 = require("./zipData");
const EARTH_RADIUS_MI = 3958.7613;
function haversineMiles(a, b) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}
// ---------------------------------------------------------------------------
// Bundled ZIP centroids — parsed once, lazily.
// ---------------------------------------------------------------------------
let centroidCache = null;
function centroids() {
    if (centroidCache)
        return centroidCache;
    const map = new Map();
    for (const line of zipData_1.ZIP_CENTROIDS_RAW.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        const [zip, lat, lng] = trimmed.split(/\s+/);
        const la = Number(lat);
        const lo = Number(lng);
        if (zip && Number.isFinite(la) && Number.isFinite(lo)) {
            map.set(zip, { lat: la, lng: lo });
        }
    }
    centroidCache = map;
    return map;
}
/** Normalize a user-entered ZIP to its 5-digit form, or null. */
function normalizeZip(raw) {
    if (typeof raw !== "string")
        return null;
    const match = raw.trim().match(/^(\d{5})(?:-\d{4})?$/);
    return match ? match[1] : null;
}
/** Centroid for a 5-digit ZIP, or null when the ZIP is unknown. */
function zipCentroid(zip) {
    const normalized = normalizeZip(zip);
    if (!normalized)
        return null;
    return centroids().get(normalized) ?? null;
}
function isValidLatLng(lat, lng) {
    return (typeof lat === "number" &&
        typeof lng === "number" &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180);
}
/** One-decimal display distance ("2.3 mi"); under 0.1 reads "<0.1 mi". */
function formatMiles(miles) {
    if (!Number.isFinite(miles) || miles < 0)
        return "";
    if (miles < 0.1)
        return "<0.1 mi";
    return `${miles.toFixed(1)} mi`;
}
