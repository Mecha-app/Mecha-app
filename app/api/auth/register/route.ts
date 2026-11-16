import { NextResponse } from "next/server";
import { registerDriver } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Security pass: registration is the signup-spam surface. Coarse
// per-instance per-IP limiter (see lib/server/ratelimit.ts); the
// identity rule below does the rest — duplicates create nothing.
const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/register — create a driver account.
 *
 * Identity rule (owner): if the email OR the phone already belongs to
 * an account, this returns 409 identity_exists and creates NOTHING —
 * the person signs in to the identity they already have, quota intact.
 * A fresh identity starts with the full 5 free diagnoses, server-side.
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
  try {
    const result = await registerDriver(getIdentityStore(), body);
    return NextResponse.json({ status: "ok", ...result }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
