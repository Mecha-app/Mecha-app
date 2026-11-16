import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { getBetterAuth } from "@/lib/server/betterAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/auth/* — the Better Auth handler (AUTH DECISION 2026-11-06).
 * Better Auth's standard routes live here: /api/auth/sign-in/social,
 * /api/auth/sign-in/email, /api/auth/sign-up/email,
 * /api/auth/callback/google (the redirect URI registered on the
 * Google Cloud OAuth client), /api/auth/get-session, /api/auth/sign-out.
 * The concrete legacy routes (login, register, google/start, …) are
 * static siblings and keep resolving to themselves during staging —
 * Next.js static segments win over this catch-all.
 *
 * Unwired discipline: without DATABASE_URL + BETTER_AUTH_SECRET the
 * handler answers an honest 501, exactly like every other unwired
 * capability in the rebuild. Nothing is fake-served.
 */

function unavailable() {
  return NextResponse.json(
    {
      status: "unavailable",
      error: "better_auth_not_configured",
      detail: "Better Auth is not wired in this environment yet.",
    },
    { status: 501 },
  );
}

export async function GET(request: Request) {
  const auth = getBetterAuth();
  if (!auth) return unavailable();
  return toNextJsHandler(auth.handler).GET(request);
}

export async function POST(request: Request) {
  const auth = getBetterAuth();
  if (!auth) return unavailable();
  return toNextJsHandler(auth.handler).POST(request);
}
