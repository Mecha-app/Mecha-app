import { NextResponse } from "next/server";
import { completeGoogleSignIn, type AuthResult } from "@/lib/server/authService";
import {
  GOOGLE_STATE_COOKIE,
  exchangeGoogleCode,
  getGoogleVerifier,
  isGoogleConfigured,
} from "@/lib/server/googleAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback — Google's return leg.
 *
 * The state query param must match the state cookie set by /start;
 * the check itself lives in the service (completeGoogleSignIn) so it
 * is test-covered. ANY failure — Google's own error param, a missing
 * code, a state mismatch, a failed exchange or verification, a
 * refused link — lands on /login?error=google, where the page shows
 * ONE generic message. Provider error details are never leaked into
 * the URL, the page, or a response body.
 *
 * Success hands the standard auth payload to the client the same way
 * the login page consumes it: /auth/google/complete receives the token
 * + public user in the URL FRAGMENT (never sent to any server, never
 * logged), stores the session via saveSession, and routes onward —
 * honoring the same return-to contract as the password sign-in.
 */

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function failureRedirect(request: Request): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "google");
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 0,
  });
  return response;
}

function successRedirect(request: Request, result: AuthResult): NextResponse {
  const url = new URL("/auth/google/complete", request.url);
  const fragment = new URLSearchParams({
    token: result.token,
    user: JSON.stringify(result.user),
  });
  url.hash = fragment.toString();
  const response = NextResponse.redirect(url);
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  if (!isGoogleConfigured()) return failureRedirect(request);
  const verifier = getGoogleVerifier();
  if (!verifier) return failureRedirect(request);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return failureRedirect(request);

  try {
    const result = await completeGoogleSignIn(
      getIdentityStore(),
      { code, state, expectedState: readCookie(request, GOOGLE_STATE_COOKIE) },
      { verifier, exchangeCode: exchangeGoogleCode },
    );
    return successRedirect(request, result);
  } catch {
    return failureRedirect(request);
  }
}
