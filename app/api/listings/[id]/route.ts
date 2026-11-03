import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { NotFoundError } from "@/lib/server/errors";
import { apiError, readJsonBody } from "@/lib/server/http";
import { bearerPayload, isAuthConfigured } from "@/lib/server/jwt";
import { requireAuth } from "@/lib/server/routeAuth";
import { deleteListingForSeller, updateListingForSeller } from "@/lib/server/listingService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/listings/[id] — public detail (GET), owner-only lifecycle
 * (PATCH/DELETE). A sold/removed listing's detail answers 404 to the
 * public; its owner still sees it through ?mine=1. View counting
 * skips the owner looking at their own ad.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const store = getAppStore();
    const listing = await store.findListingById(id);
    if (!listing) throw new NotFoundError("Listing not found.");
    let viewerId: string | null = null;
    if (isAuthConfigured()) {
      try {
        viewerId = bearerPayload(request)?.id ?? null;
      } catch {
        viewerId = null;
      }
    }
    const isOwner = viewerId !== null && viewerId === listing.sellerId;
    if (listing.status !== "active" && !isOwner) {
      throw new NotFoundError("Listing not found.");
    }
    if (!isOwner) {
      await store.incrementListingViews(id);
      listing.views += 1;
    }
    return NextResponse.json({ status: "ok", listing });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  let body;
  try {
    body = await readJsonBody(request, 262_144);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const listing = await updateListingForSeller(getAppStore(), auth.payload.id, id, body);
    return NextResponse.json({ status: "ok", listing });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    await deleteListingForSeller(getAppStore(), auth.payload.id, id);
    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
