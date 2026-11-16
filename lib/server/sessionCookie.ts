import type { NextResponse } from "next/server";

/**
 * The first-party session cookie (session-persistence fix,
 * owner report 2026-11-16: "Sign up and sign in, they don't work…
 * it says you sign up but you never get inside the account").
 *
 * THE BUG: the app session lived ONLY in localStorage
 * (lib/client/auth.ts). On the owner's phone (mobile Safari /
 * in-app webviews) that storage did not survive the sign-in
 * round-trip — most sharply the Google OAuth trip through another
 * browser context — so every door "succeeded" and then the /app
 * guard found no token and bounced straight back to /login. A
 * sign-in loop on every door, while desktop (where localStorage
 * persists) held the session fine.
 *
 * THE FIX: the session JWT is ALSO carried by a first-party
 * cookie set by mechatech.io itself:
 *   - name `mecha_session`, value = the same 30-day JWT the
 *     Bearer contract already uses (payload {id, type} only);
 *   - attributes: Path=/, Secure, SameSite=Lax, Max-Age matching
 *     the token's 30-day life. First-party + Lax is what mobile
 *     Safari accepts and keeps; no SameSite=None, no third-party
 *     context, no cross-site dependence.
 *   - every auth completion response sets it (see withSessionCookie
 *     wired into login / register / email-code verify + signup /
 *     complete-phone / business login + register / session-bridge);
 *   - the Google door sets it on a TOP-LEVEL NAVIGATION response —
 *     GET /api/auth/google/establish answers a 302 redirect with
 *     this Set-Cookie — the strongest storage guarantee a browser
 *     gives, and the one the OAuth round-trip needs;
 *   - the client guard reads the cookie FIRST (lib/client/auth.ts
 *     getToken), localStorage second, so a stored cookie session
 *     survives reloads and in-app navigation with no bounce;
 *   - the server gates accept it too (bearerPayload falls back to
 *     the cookie), so same-origin API calls authenticate from the
 *     cookie alone. SameSite=Lax keeps cross-site POSTs from
 *     carrying it, so the fallback opens no CSRF door.
 *
 * HttpOnly is deliberately NOT set: the /app guard is client code
 * and must read the cookie (that is this fix's contract). The
 * exposure class is unchanged from the localStorage token it
 * supersedes — a minimal {id, type} payload behind the app's CSP
 * (default-src 'self'); the 2026-11-03 note's httpOnly migration
 * remains the future hardening, to land when the guards move
 * server-side.
 */

export const SESSION_COOKIE_NAME = "mecha_session";

/** Matches the session JWT's own 30-day expiry (lib/server/jwt). */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookieHeader(token: string): string {
  return (
    `${SESSION_COOKIE_NAME}=${token}; Path=/; ` +
    `Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}; Secure; SameSite=Lax`
  );
}

export function clearedSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
}

/** Attach the session cookie to an auth completion response. */
export function withSessionCookie<T extends NextResponse>(response: T, token: string): T {
  response.headers.append("Set-Cookie", sessionCookieHeader(token));
  return response;
}

/** Read the session token out of a Cookie request header. */
export function sessionTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE_NAME) {
      const value = part.slice(eq + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}
