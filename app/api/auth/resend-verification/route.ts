import { NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/server/accountCodes";
import { apiError } from "@/lib/server/http";
import { getMailer } from "@/lib/server/mailer";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { requireAuth } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Two layers, like the rest of the auth surface: a coarse per-IP cap
// here, and the service's per-account 60-second resend cooldown.
const resendLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/auth/resend-verification — send a fresh verification code
 * (the previous one dies). The response carries the DELIVERY STATE:
 * when email transport isn't wired in this environment, the code is
 * still generated + stored and the answer says `not_configured`
 * instead of pretending an email went out.
 */
export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  if (resendLimiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many attempts — try again in a minute." },
      { status: 429 },
    );
  }
  try {
    const store = getIdentityStore();
    const user = await store.findUserById(auth.payload.id);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const result = await sendVerificationCode(store, getMailer(), user);
    return NextResponse.json({ status: "ok", delivery: result.delivery });
  } catch (err) {
    return apiError(err);
  }
}
