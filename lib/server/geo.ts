import { ZIP_CENTROIDS_RAW } from "./zipData";

/**
 * Geography for the nearby flows (WP6) — dependency-free by design:
 * ZIP → centroid comes from the bundled Census table (lib/server/
 * zipData.ts); distances are a local haversine. No geocoding API, no
 * key, no network call stands between a stranded driver and the list
 * of shops — the owner's accuracy requirement is served by data that
 * is already on the server.
 *
 * Distances are MILES throughout the product surface (the repo's shop
 * search radius was miles — 25 shops / 30 towing — and 0001's
 * haversine_km() is converted at the query layer for the same reason).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_MI = 3958.7613;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ---------------------------------------------------------------------------
// Bundled ZIP centroids — parsed once, lazily.
// ---------------------------------------------------------------------------

let centroidCache: Map<string, LatLng> | null = null;

function centroids(): Map<string, LatLng> {
  if (centroidCache) return centroidCache;
  const map = new Map<string, LatLng>();
  for (const line of ZIP_CENTROIDS_RAW.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
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
export function normalizeZip(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}

/** Centroid for a 5-digit ZIP, or null when the ZIP is unknown. */
export function zipCentroid(zip: string): LatLng | null {
  const normalized = normalizeZip(zip);
  if (!normalized) return null;
  return centroids().get(normalized) ?? null;
}

export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** One-decimal display distance ("2.3 mi"); under 0.1 reads "<0.1 mi". */
export function formatMiles(miles: number): string {
  if (!Number.isFinite(miles) || miles < 0) return "";
  if (miles < 0.1) return "<0.1 mi";
  return `${miles.toFixed(1)} mi`;
}
