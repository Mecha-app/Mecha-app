import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import {
  BusinessGoogleNoAccountError,
  completeBusinessGoogleSignIn,
  type BusinessAuthResult,
} from "@/lib/server/businessService";
import {
  BUSINESS_GOOGLE_STATE_COOKIE,
  exchangeBusinessGoogleCode,
  getGoogleVerifier,
  isGoogleConfigured,
} from "@/lib/server/googleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/business/google/callback — Google's return leg for the
 * BUSINESS door. The state check lives in the service
 * (completeBusinessGoogleSignIn) so it is test-covered.
 *
 * Success hands the business payload to /business/google/complete in
 * the URL FRAGMENT (the driver flow's pattern — never sent to a
 * server, never logged), which stores the session and lands on the
 * business dashboard.
 *
 * Failures land on /business/login with ONE honest flag each:
 * ?error=google_no_account when the Google email has no business
 * behind it (the page explains: list the business first), and
 * ?error=google for everything else. Provider details never leak.
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

function failureRedirect(request: Request, flag: string): NextResponse {
  const url = new URL("/business/login", request.url);
  url.searchParams.set("error", flag);
  const response = NextResponse.redirect(url);
  response.cookies.set(BUSINESS_GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/business/google",
    maxAge: 0,
  });
  return response;
}

function successRedirect(request: Request, result: BusinessAuthResult): NextResponse {
  const url = new URL("/business/google/complete", request.url);
  const fragment = new URLSearchParams({
    token: result.token,
    business: JSON.stringify(result.business),
  });
  url.hash = fragment.toString();
  const response = NextResponse.redirect(url);
  response.cookies.set(BUSINESS_GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/business/google",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  if (!isGoogleConfigured()) return failureRedirect(request, "google");
  const verifier = getGoogleVerifier();
  if (!verifier) return failureRedirect(request, "google");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return failureRedirect(request, "google");

  try {
    const result = await completeBusinessGoogleSignIn(
      getAppStore(),
      { code, state, expectedState: readCookie(request, BUSINESS_GOOGLE_STATE_COOKIE) },
      { verifier, exchangeCode: exchangeBusinessGoogleCode },
    );
    return successRedirect(request, result);
  } catch (err) {
    if (err instanceof BusinessGoogleNoAccountError) {
      return failureRedirect(request, "google_no_account");
    }
    return failureRedirect(request, "google");
  }
}
