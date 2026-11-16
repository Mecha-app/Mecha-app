import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { requireAuth } from "@/lib/server/routeAuth";
import { identifyWarningLights } from "@/lib/server/scanService";
import {
  VisionProviderError,
  getWarningLightProvider,
} from "@/lib/server/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scan/photo (Scan package, dashboard-photo mode) —
 * identifies the warning lights in a dashboard photo.
 *
 * Discipline, matching the rest of the rebuild:
 *   - Drivers only (requireAuth) — an anonymous photo never burns a
 *     paid vision call.
 *   - NO quota consumption: identification is triage. The full
 *     diagnosis the driver may run afterwards consumes exactly once,
 *     through /api/diagnose → diagnoseService, like every diagnosis.
 *   - Honest 501 when the AI layer is not wired — checked before the
 *     upload is even read; a result is never fabricated.
 *   - The photo is processed in memory and never stored.
 */

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // the legacy app's diagnosis-image cap
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;

  if (limiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many photos — give it a minute and try again." },
      { status: 429 },
    );
  }

  let provider;
  try {
    provider = getWarningLightProvider();
  } catch (err) {
    return apiError(err);
  }
  if (!provider) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: "ai_not_configured",
        detail: "Dashboard photo identification is not wired in this environment yet.",
      },
      { status: 501 },
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
      { error: "photo_required", detail: "Attach the dashboard photo as the 'photo' field." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: "unsupported_image",
        detail: "Please use a JPEG, PNG, or WebP photo of the dashboard.",
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "payload_too_large", detail: "That photo is over 5 MB — try a closer crop." },
      { status: 413 },
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await identifyWarningLights(provider, {
      imageBase64: bytes.toString("base64"),
      mediaType: file.type,
    });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    if (err instanceof VisionProviderError) {
      return NextResponse.json(
        {
          error: err.code,
          detail: "The photo could not be read. Try a clearer, closer photo of the dashboard with the ignition on.",
        },
        { status: 502 },
      );
    }
    return apiError(err);
  }
}
