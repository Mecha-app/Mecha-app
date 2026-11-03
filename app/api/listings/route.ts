import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";
import { createListing, searchPublicListings } from "@/lib/server/listingService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/listings — public marketplace browse + ZIP/text search.
 * With `?mine=1` and a driver session it returns the caller's own
 * listings (all statuses) for the sell/manage screen instead.
 * POST /api/listings — create a listing (driver session required;
 * the guided-photo minimum is enforced in the service).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    if (url.searchParams.get("mine") === "1") {
      const auth = requireAuth(request, ["driver"]);
      if ("response" in auth) return auth.response;
      const listings = await getAppStore().listListingsBySeller(auth.payload.id);
      return NextResponse.json({ status: "ok", count: listings.length, results: listings });
    }
    const result = await searchPublicListings(getAppStore(), {
      zip: url.searchParams.get("zip") ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
      radiusMi: url.searchParams.get("radiusMi") ?? undefined,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  let body;
  try {
    body = await readJsonBody(request, 262_144);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const seller = await getIdentityStore().findUserById(auth.payload.id);
    if (!seller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const listing = await createListing(getAppStore(), seller, body);
    return NextResponse.json({ status: "ok", listing }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
