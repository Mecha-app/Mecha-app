import { NextResponse } from "next/server";
import { verifyEmailCode } from "@/lib/server/codeAuth";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The code-check surface: 6 digits is a small space, so on top of the
// per-code attempt cap (5, enforced in the service) the route keeps
// the same coarse per-IP discipline as sign-in.
const verifyLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/email-code/verify — check an email code (0013).
 *
 * Two honest outcomes, both 200:
 *   - kind "signed_in"       the email had an account; the code just
 *                            signed the person in (token + user +
 *                            quota, the standard auth payload).
 *   - kind "signup_verified" the email is new; the code proved it.
 *                            The ticket binds that email for 15
 *                            minutes — the client collects name +
 *                            password and completes at
 *                            /api/auth/email-code/signup.
 * Every failure is the one generic invalid_code error (400) — never
 * a hint about which part failed or whether the email exists.
 */
export async function POST(request: Request) {
  if (verifyLimiter.limited(request)) {
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
    const outcome = await verifyEmailCode(getIdentityStore(), body.email, body.code);
    if (outcome.kind === "signed_in") {
      return NextResponse.json({ status: "ok", kind: outcome.kind, ...outcome.result });
    }
    return NextResponse.json({ status: "ok", kind: outcome.kind, ticket: outcome.ticket });
  } catch (err) {
    return apiError(err);
  }
}
