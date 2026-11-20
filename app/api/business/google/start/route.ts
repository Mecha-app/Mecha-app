import { NextResponse } from "next/server";
import {
  BUSINESS_GOOGLE_STATE_COOKIE,
  GoogleNotConfiguredError,
  buildBusinessGoogleAuthorizeUrl,
  isGoogleConfigured,
  newGoogleState,
} from "@/lib/server/googleAuth";
import { createRateLimiter } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/business/google/start — begin Google sign-in for a
 * BUSINESS (shops + towing). The business door is deliberately its
 * own flow (own state cookie, own callback, own redirect URI): a
 * Google email that belongs to a shop resolves to the shop, never
 * to a driver account. Unconfigured → an honest 501, matching the
 * driver door's discipline; the button that links here renders only
 * when the server reports Google configured.
 */

const STATE_COOKIE_MAX_AGE_SECONDS = 600;

const startLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export async function GET(request: Request) {
  if (startLimiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many sign-in attempts — try again in a minute." },
      { status: 429 },
    );
  }
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: new GoogleNotConfiguredError().code,
        detail: "Google sign-in is not wired in this environment yet.",
      },
      { status: 501 },
    );
  }
  const state = newGoogleState();
  const response = NextResponse.redirect(buildBusinessGoogleAuthorizeUrl(state));
  response.cookies.set(BUSINESS_GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/business/google",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
