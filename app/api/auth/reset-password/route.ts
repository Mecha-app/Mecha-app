import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/server/accountCodes";
import { authResultFor } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resetLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/reset-password — complete a reset: the same email or
 * phone identifier, the emailed code, and the new password. Success
 * answers the standard auth payload, so the client signs the person
 * straight back in. Every bad path (unknown identifier, wrong/expired
 * code, attempts exhausted) answers the same generic 400.
 */
export async function POST(request: Request) {
  if (resetLimiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many attempts — try again in a minute." },
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
    const user = await resetPassword(getIdentityStore(), body.identifier, body.code, body.password);
    return NextResponse.json({ status: "ok", ...authResultFor(user) });
  } catch (err) {
    return apiError(err);
  }
}
