import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { bearerPayload } from "@/lib/server/jwt";
import { submitShopReview } from "@/lib/server/publicProfileService";
import { listingPhotoUrl } from "@/lib/server/uploadService";
import { requireAuth } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/shops/<id>/reviews — REAL customer reviews (0022).
 *
 *   POST (driver session) — write or edit the caller's review:
 *        { rating: 1–5, body }. One per account per shop, enforced
 *        by the store's unique (shop_id, user_id) row. The author's
 *        name comes from their account, never from the request.
 *        Shops cannot post here (driver tokens only) and have no
 *        edit/delete path for reviews of themselves anywhere.
 *   GET — the caller's own review when a valid driver token rides
 *        along ({ mine }), so the profile page can prefill the form;
 *        { mine: null } otherwise. The public list rides on
 *        GET /api/shops/<id>.
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { status: "error", error: "not_found", detail: "That shop does not exist." },
      { status: 404 },
    );
  }
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const result = await submitShopReview(getAppStore(), getIdentityStore(), {
      shopId: id,
      userId: auth.payload.id,
      rating: body.rating,
      body: body.body,
      photoIds: body.photoIds,
    });
    return NextResponse.json({ status: "ok", ...result }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let mine = null;
  try {
    const payload = bearerPayload(request);
    if (payload && payload.type === "driver") {
      const review = await getAppStore().getShopReview(id, payload.id);
      if (review) {
        mine = {
          id: review.id,
          authorName: review.authorName,
          rating: review.rating,
          body: review.body,
          photoIds: review.photoIds,
          photoUrls: review.photoIds.map((pid) => listingPhotoUrl(pid)),
          createdAt: review.createdAt,
        };
      }
    }
  } catch {
    mine = null;
  }
  return NextResponse.json({ status: "ok", mine });
}
