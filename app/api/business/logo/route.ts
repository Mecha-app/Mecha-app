import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { requireAuth } from "@/lib/server/routeAuth";
import { removeBusinessLogo, storeBusinessLogo } from "@/lib/server/uploadService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/business/logo — the signed-in shop/towing company's profile
 * photo (0021; owner order 2026-11-20).
 *
 *   POST   multipart 'photo' → store/replace the caller's logo.
 *   DELETE                   → remove it (profile falls back to the
 *                              clean initials placeholder).
 *
 * The business id comes from the session token — a business can only
 * ever touch its OWN logo. The file rules are the listing-photo rules
 * (JPEG/PNG/WebP, 5 MB) enforced in uploadService. Optional by
 * design: nothing anywhere requires a logo.
 */

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export async function POST(request: Request) {
  const auth = requireAuth(request, ["shop", "towing"]);
  if ("response" in auth) return auth.response;
  // requireAuth has already refused every non-business token.
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
    const stored = await storeBusinessLogo(
      getAppStore(),
      { id: auth.payload.id, kind },
      { contentType: file.type, data: bytes },
    );
    return NextResponse.json({ status: "ok", ...stored }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(request: Request) {
  const auth = requireAuth(request, ["shop", "towing"]);
  if ("response" in auth) return auth.response;
  const kind = auth.payload.type as "shop" | "towing";
  try {
    await removeBusinessLogo(getAppStore(), {
      id: auth.payload.id,
      kind,
    });
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return apiError(err);
  }
}
