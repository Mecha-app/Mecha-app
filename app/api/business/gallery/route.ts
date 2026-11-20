import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { requireAuth } from "@/lib/server/routeAuth";
import { storeBusinessGalleryPhoto } from "@/lib/server/uploadService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/business/gallery — add ONE photo to the signed-in
 * business's gallery (0021; owner order 2026-11-20: "three or four
 * photos of their shop if they want to"). Multipart 'photo'; the
 * business id comes from the session token; the cap (4) and the
 * file rules (JPEG/PNG/WebP, 5 MB) live in uploadService. Removal
 * is DELETE /api/business/gallery/<uploadId>. Serving reuses
 * GET /api/business/logo/<uploadId> (one public byte route for all
 * business uploads).
 */

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export async function POST(request: Request) {
  const auth = requireAuth(request, ["shop", "towing"]);
  if ("response" in auth) return auth.response;
  const kind = auth.payload.type as "shop" | "towing";

  if (limiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many uploads — give it a minute and try again." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_form", detail: "Send the photo as multipart form data." },
      { status: 400 },
    );
  }
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "photo_required", detail: "Attach the photo as the 'photo' field." },
      { status: 400 },
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await storeBusinessGalleryPhoto(
      getAppStore(),
      { id: auth.payload.id, kind },
      { contentType: file.type, data: bytes },
    );
    return NextResponse.json({ status: "ok", ...stored }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
