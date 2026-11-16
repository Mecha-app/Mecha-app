import { NextResponse } from "next/server";
import { requestEmailCode } from "@/lib/server/codeAuth";
import { readJsonBody } from "@/lib/server/http";
import { getMailer } from "@/lib/server/mailer";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailCodeLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/email-code — the ONE email door (0013): ask for a
 * 6-digit code by email. If the email already has an account, the
 * code will sign the person in; if it doesn't, the code starts the
 * sign-up. Which of the two is never revealed here.
 *
 * ANTI-ENUMERATION: this route answers the IDENTICAL body whether the
 * email matches an account, matches nothing, or the body is unusable
 * (the forgot-password discipline) — and a store failure stays
 * invisible for the same reason. Only the inbox learns the truth.
 */
const ANSWER = {
  status: "ok",
  detail:
    "If that email can receive a code, one is on its way. The code lasts 15 minutes.",
} as const;

export async function POST(request: Request) {
  if (emailCodeLimiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many attempts — try again in a minute." },
      { status: 429 },
    );
  }
  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    body = null;
  }
  try {
    await requestEmailCode(getIdentityStore(), getMailer(), body?.email);
  } catch {
    // A store failure must not become an existence oracle either; the
    // answer stays the same and no code was promised anywhere.
  }
  return NextResponse.json({ ...ANSWER });
}
