import { NextResponse } from "next/server";
import {
  GOOGLE_STATE_COOKIE,
  GoogleNotConfiguredError,
  buildGoogleAuthorizeUrl,
  isGoogleConfigured,
  newGoogleState,
} from "@/lib/server/googleAuth";
import { createRateLimiter } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/start — begin Google sign-in (drivers only).
 * Sets the short-lived state cookie (httpOnly, SameSite=Lax — Lax so
 * it survives the top-level return navigation from Google) and 302s
 * to Google's authorize URL. Unconfigured → an honest 501, matching
 * the rebuild's unwired discipline: the button that links here is
 * only rendered when the server reports the feature configured.
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
  const response = NextResponse.redirect(buildGoogleAuthorizeUrl(state));
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
