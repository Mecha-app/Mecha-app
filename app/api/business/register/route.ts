import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { registerBusiness, type BusinessKind } from "@/lib/server/businessService";
import { ValidationError } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same signup-spam posture as driver registration (WP5 security pass).
const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/business/register { kind: "shop" | "towing", ... } —
 * self-signup for the supply side of the nearby flows. The business
 * lands geocoded from its ZIP (bundled Census centroids) so it can be
 * found by stranded drivers the moment it registers.
 */
export async function POST(request: Request) {
  if (registerLimiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many sign-up attempts — try again in a minute." },
      { status: 429 },
    );
  }
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  const kind = body.kind;
  if (kind !== "shop" && kind !== "towing") {
    return apiError(new ValidationError('"kind" must be "shop" or "towing".'));
  }
  try {
    const result = await registerBusiness(getAppStore(), kind as BusinessKind, body);
    return NextResponse.json({ status: "ok", ...result }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
