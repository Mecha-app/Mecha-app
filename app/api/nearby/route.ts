import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { searchNearby, type NearbyKind } from "@/lib/server/nearbyService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/nearby?kind=shops|towing&zip=02108|lat=..&lng=..&radiusMi=25
 *
 * The roadside flow — public by design (a stranded driver may not have
 * an account yet; the repo's shop search was public too). The answer
 * leads with the plain-language count, then businesses ordered by
 * distance, name first, phone ready to tap.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kindParam = url.searchParams.get("kind");
  const kind: NearbyKind = kindParam === "towing" ? "towing" : "shops";
  try {
    const result = await searchNearby(getAppStore(), {
      kind,
      zip: url.searchParams.get("zip") ?? undefined,
      lat: url.searchParams.get("lat") ?? undefined,
      lng: url.searchParams.get("lng") ?? undefined,
      radiusMi: url.searchParams.get("radiusMi") ?? undefined,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return apiError(err);
  }
}
