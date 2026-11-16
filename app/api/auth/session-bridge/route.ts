import { NextResponse } from "next/server";
import { getBetterAuth } from "@/lib/server/betterAuth";
import { betterAuthSessionPayload } from "@/lib/server/betterAuthLink";
import { getIdentityStore } from "@/lib/server/store";
import { withSessionCookie } from "@/lib/server/sessionCookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session-bridge — convert a live Better Auth cookie
 * session into the app's standard auth payload ({token, user,
 * quota}), the exact body the password and legacy-Google doors
 * answer.
 *
 * Since the 2026-11-16 persistence fix the Google completion page
 * no longer calls this route: it establishes the session through
 * the top-level navigation at /api/auth/google/establish, so the
 * session cookie is set on a redirect response (the fetch +
 * localStorage exchange looped on the owner's phone). The bridge
 * remains as the same conversion over a plain authenticated GET —
 * and it sets the session cookie on its response like every other
 * auth completion.
 *
 * No Better Auth session → 401. Better Auth unwired → an honest 501.
 * The response carries the app JWT only over this authenticated
 * channel (the caller's own session cookie), never in a URL.
 */
export async function GET(request: Request) {
  const auth = getBetterAuth();
  if (!auth) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: "better_auth_not_configured",
        detail: "Better Auth is not wired in this environment yet.",
      },
      { status: 501 },
    );
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", detail: "No Better Auth session." },
      { status: 401 },
    );
  }
  const payload = await betterAuthSessionPayload(getIdentityStore(), session.user.id);
  if (!payload) {
    return NextResponse.json(
      { error: "unauthorized", detail: "The signed-in account no longer exists." },
      { status: 401 },
    );
  }
  return withSessionCookie(NextResponse.json({ status: "ok", ...payload }), payload.token);
}
