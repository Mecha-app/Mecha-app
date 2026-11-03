import { ValidationError } from "./authService";
import { formatMiles, isValidLatLng, normalizeZip, zipCentroid, type LatLng } from "./geo";
import type { AppStore, NearbyBusiness } from "./appStore";

/**
 * Nearby search (WP6) — the owner's signature roadside flow.
 *
 * Input: a ZIP code (resolved through the bundled Census centroids —
 * no external geocoder) or device coordinates. Output: a plain-language
 * count FIRST ("6 shops near you"), then the list ordered by distance.
 * Every result LEADS WITH THE BUSINESS NAME — the name is the largest
 * element on the card; distance, the tap-to-call phone, and directions
 * hang off it (owner's layout rule, 2026-11-03).
 *
 * Defaults carry the repo's own radii: shops 25 mi, towing 30 mi —
 * and a towing company is only shown inside the service radius IT set
 * for itself (enforced in the store).
 */

export type NearbyKind = "shops" | "towing";

export const NEARBY_DEFAULT_RADIUS: Record<NearbyKind, number> = {
  shops: 25,
  towing: 30,
};

export interface NearbyResult extends NearbyBusiness {
  distanceLabel: string;
}

export interface NearbySearchResult {
  kind: NearbyKind;
  origin: LatLng & { source: "zip" | "device"; zip: string | null };
  radiusMi: number;
  count: number;
  /** Plain-language headline, e.g. "6 shops near you". */
  headline: string;
  results: NearbyResult[];
}

export function nearbyHeadline(kind: NearbyKind, count: number, radiusMi: number): string {
  const noun = kind === "shops" ? "shop" : "towing company";
  const plural = kind === "shops" ? "shops" : "towing companies";
  if (count === 0) return `No ${plural} within ${radiusMi} miles — try widening the search.`;
  if (count === 1) return `1 ${noun} near you`;
  return `${count} ${plural} near you`;
}

export async function searchNearby(
  store: AppStore,
  input: { kind: NearbyKind; zip?: unknown; lat?: unknown; lng?: unknown; radiusMi?: unknown },
): Promise<NearbySearchResult> {
  let origin: (LatLng & { source: "zip" | "device"; zip: string | null }) | null = null;

  const lat = typeof input.lat === "number" ? input.lat : Number(input.lat);
  const lng = typeof input.lng === "number" ? input.lng : Number(input.lng);
  if (isValidLatLng(lat, lng)) {
    origin = { lat, lng, source: "device", zip: null };
  } else if (input.zip !== undefined && input.zip !== "") {
    const zip = normalizeZip(input.zip);
    if (!zip) throw new ValidationError('"zip" must be a 5-digit ZIP code.');
    const centroid = zipCentroid(zip);
    if (!centroid) {
      throw new ValidationError(
        "That ZIP code isn't in our table yet — use “Near me” so the app can take your location instead.",
      );
    }
    origin = { ...centroid, source: "zip", zip };
  }
  if (!origin) {
    throw new ValidationError("Give a ZIP code, or share your location, so we can find who's near you.");
  }

  const radiusRaw = typeof input.radiusMi === "number" ? input.radiusMi : Number(input.radiusMi);
  const radiusMi = Number.isFinite(radiusRaw)
    ? Math.min(100, Math.max(1, radiusRaw))
    : NEARBY_DEFAULT_RADIUS[input.kind];

  const found =
    input.kind === "shops"
      ? await store.nearbyShops(origin, radiusMi, 50)
      : await store.nearbyTowing(origin, radiusMi, 50);

  const results: NearbyResult[] = found.map((b) => ({
    ...b,
    distanceMi: Math.round(b.distanceMi * 10) / 10,
    distanceLabel: formatMiles(b.distanceMi),
  }));

  return {
    kind: input.kind,
    origin,
    radiusMi,
    count: results.length,
    headline: nearbyHeadline(input.kind, results.length, radiusMi),
    results,
  };
}
