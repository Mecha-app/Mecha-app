import { NextResponse } from "next/server";
import { getBetterAuth } from "@/lib/server/betterAuth";
import { betterAuthSessionPayload } from "@/lib/server/betterAuthLink";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session-bridge — convert a live Better Auth cookie
 * session into the app's standard auth payload ({token, user,
 * quota}), the exact body the password and legacy-Google doors
 * answer. The Google completion page calls this after the Better
 * Auth callback lands (no URL fragment on that path) and then runs
 * the same saveSession + phone-gate routing as every other door.
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
  return NextResponse.json({ status: "ok", ...payload });
}
