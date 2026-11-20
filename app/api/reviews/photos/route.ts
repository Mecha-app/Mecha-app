import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { requireAuth } from "@/lib/server/routeAuth";
import { storeListingPhoto } from "@/lib/server/uploadService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/photos — a signed-in DRIVER uploads a photo for
 * the review they're writing (owner order 2026-11-20). Real file
 * uploads through the same service and rules as listing photos
 * (JPEG/PNG/WebP, 5 MB), stored under the driver's account in the
 * 0015 uploads table; the review submit then attaches up to 3 of
 * the caller's own upload ids — the review service verifies
 * ownership, so a photo can never be attached by anyone but its
 * uploader. Serving reuses GET /api/listings/photos/<id>.
 */

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;

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
    const stored = await storeListingPhoto(getAppStore(), auth.payload.id, {
      contentType: file.type,
      data: bytes,
    });
    return NextResponse.json({ status: "created", photo: stored }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
