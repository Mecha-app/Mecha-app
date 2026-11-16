import { NextResponse } from "next/server";
import { completeCodeSignup } from "@/lib/server/codeAuth";
import { apiError, readJsonBody } from "@/lib/server/http";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signupLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/email-code/signup — finish the code-first sign-up
 * (0013): the ticket from /verify plus name, password (typed twice),
 * and an OPTIONAL phone. The account is created already
 * email-verified — the code proved the inbox before the row existed.
 *
 * Every registration rule still applies (the service re-checks them
 * all): a password mismatch is refused before anything is created, a
 * phone that belongs to another account is a 409, and an email that
 * got registered by another path in the meantime is a 409
 * identity_exists — sign in instead.
 */
export async function POST(request: Request) {
  if (signupLimiter.limited(request)) {
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
    const result = await completeCodeSignup(getIdentityStore(), body.ticket, body);
    return NextResponse.json({ status: "ok", ...result }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
