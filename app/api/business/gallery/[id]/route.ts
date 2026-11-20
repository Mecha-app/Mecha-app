import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { removeBusinessGalleryPhoto } from "@/lib/server/uploadService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/business/gallery/<uploadId> — remove one of the
 * signed-in business's OWN gallery photos. The service verifies the
 * upload belongs to the caller and is a gallery photo; anything
 * else is refused.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["shop", "towing"]);
  if ("response" in auth) return auth.response;
  const kind = auth.payload.type as "shop" | "towing";
  const { id } = await params;
  try {
    await removeBusinessGalleryPhoto(getAppStore(), { id: auth.payload.id, kind }, id);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return apiError(err);
  }
}
