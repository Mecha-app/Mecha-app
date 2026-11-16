import { NextResponse } from "next/server";
import { loginDriver } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Security pass: sign-in is the credential-stuffing surface. Coarse
// per-instance per-IP limiter (see lib/server/ratelimit.ts) on top of
// bcrypt cost 12 + the service's timing-equalized failure path.
const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/login — email + password → 30-day JWT Bearer token
 * (legacy contract). The response carries the account's quota state so
 * the app can show the free-diagnosis countdown immediately.
 */
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
  try {
    const result = await loginDriver(getIdentityStore(), body);
    return NextResponse.json({ status: "ok", ...result }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
