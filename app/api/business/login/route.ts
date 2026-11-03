import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { loginBusiness, type BusinessKind } from "@/lib/server/businessService";
import { ValidationError } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login is the credential-stuffing surface — same coarse per-instance
// limiter posture as the WP5 auth routes.
const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

/** POST /api/business/login { kind: "shop" | "towing", email, password } */
export async function POST(request: Request) {
  if (loginLimiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many sign-in attempts — try again in a minute." },
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
    const result = await loginBusiness(getAppStore(), kind as BusinessKind, body);
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return apiError(err);
  }
}
