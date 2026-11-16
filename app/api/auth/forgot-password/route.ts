import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/server/accountCodes";
import { apiError, readJsonBody } from "@/lib/server/http";
import { getMailer } from "@/lib/server/mailer";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forgotLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/forgot-password — start a password reset with an
 * EMAIL or a PHONE NUMBER as the identifier.
 *
 * ANTI-ENUMERATION: this route answers the IDENTICAL body whether the
 * identifier matches an account or not (and even when the body is
 * unusable). When an account matches, a code is generated and emailed
 * to the ADDRESS ON FILE — never to the identifier itself, and never
 * by SMS (no SMS provider exists; the copy says so).
 */
const ANSWER = {
  status: "ok",
  detail:
    "If an account matches that email or phone number, we've emailed a reset code to the address on file. The code lasts 15 minutes.",
} as const;

export async function POST(request: Request) {
  if (forgotLimiter.limited(request)) {
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
  try {
    await requestPasswordReset(getIdentityStore(), getMailer(), body?.identifier);
  } catch {
    // A store failure must not become an existence oracle either; the
    // answer stays the same and no code was promised anywhere.
  }
  return NextResponse.json({ ...ANSWER });
}
