import { NextResponse } from "next/server";
import { getBetterAuth } from "@/lib/server/betterAuth";
import { betterAuthSessionPayload } from "@/lib/server/betterAuthLink";
import { withSessionCookie } from "@/lib/server/sessionCookie";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/establish?to=<in-app path> — establish the
 * app session after a Google sign-in, as a TOP-LEVEL NAVIGATION
 * (session-persistence fix, 2026-11-16).
 *
 * Why this exists: the completion page used to FETCH the session
 * payload from /api/auth/session-bridge and store it in
 * localStorage. On the owner's phone that storage did not survive
 * (mobile Safari / in-app webview storage partitioning around the
 * OAuth round-trip), so sign-in "succeeded" and the /app guard
 * immediately bounced him back to /login — a loop on every door.
 * Here the browser itself navigates: this route reads the Better
 * Auth cookie session (set by the OAuth callback on this same
 * origin), mints the app's standard payload, and answers a
 * redirect to the destination WITH the first-party session cookie
 * on the response (lib/server/sessionCookie.ts) — the storage a
 * browser guarantees for a first-party navigation. The token
 * travels only in the Set-Cookie header, never in a URL.
 *
 * The destination is the caller's `to` — honored only for /app
 * itself and in-app paths under it (the scan flow's return-to
 * contract); anything else falls back to the dashboard. Every
 * failure (Better Auth unwired, no session, account gone) goes
 * back to /login with the generic Google error flag — the same
 * honest dead end the completion page used.
 */
function safeDestination(raw: string | null): string {
  if (raw && (raw === "/app" || raw.startsWith("/app/")) && !raw.startsWith("//")) {
    return raw;
  }
  return "/app";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () => NextResponse.redirect(new URL("/login?error=google", request.url));

  const auth = getBetterAuth();
  if (!auth) return fail();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return fail();
  const payload = await betterAuthSessionPayload(getIdentityStore(), session.user.id);
  if (!payload) return fail();

  const response = NextResponse.redirect(new URL(safeDestination(url.searchParams.get("to")), request.url));
  return withSessionCookie(response, payload.token);
}
