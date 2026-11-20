import type { LatLng } from "./geo";

/**
 * ZIP supplements (owner order 2026-11-20: "make sure the ZIP code
 * thing works" — a driver typing 02101, downtown Boston, got "that
 * ZIP isn't in our table yet").
 *
 * The bundled table (lib/server/zipData.ts) is the Census ZCTA file,
 * and some REAL USPS ZIPs have no ZCTA: downtown/unique ZIPs whose
 * mail all lands inside a neighboring ZCTA. 02101 is the case that
 * surfaced — Boston's downtown ZIP, absent from the Census file while
 * every ZIP around it (02108–02111, 02113…) is present.
 *
 * Each supplement pins such a ZIP to the centroid of the ZCTA that
 * geographically contains it — for a 25-mile shop search, the sub-mile
 * offset is immaterial, and an honest nearby answer beats the dead
 * end the driver hit before. The generated Census table itself is
 * never hand-edited; supplements live here, consulted only when the
 * main table misses (lib/server/geo.ts zipCentroid).
 *
 * Boston, MA — downtown + unique ZIPs with no ZCTA, pinned to the
 * containing downtown centroid (02108/02110 area, Government Center):
 */
const DOWNTOWN_BOSTON: LatLng = { lat: 42.3601, lng: -71.0589 };

export const ZIP_SUPPLEMENTS: Record<string, LatLng> = {
  // Downtown Boston (02108 ZCTA contains them).
  "02101": DOWNTOWN_BOSTON,
  "02102": DOWNTOWN_BOSTON,
  "02103": DOWNTOWN_BOSTON,
  "02104": DOWNTOWN_BOSTON,
  "02105": DOWNTOWN_BOSTON,
  "02106": DOWNTOWN_BOSTON,
  "02107": DOWNTOWN_BOSTON,
  "02112": DOWNTOWN_BOSTON,
  "02133": DOWNTOWN_BOSTON,
  // Back Bay, Boston — pinned to the adjacent 02116 centroid.
  "02117": { lat: 42.3506, lng: -71.0764 },
  // Roxbury, Boston — pinned to the adjacent 02118 centroid.
  "02123": { lat: 42.3376, lng: -71.0705 },
  // Harvard Business School (Allston) — pinned to the adjacent
  // 02134 centroid.
  "02163": { lat: 42.358, lng: -71.1286 },
};
