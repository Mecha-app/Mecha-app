import { NextResponse } from "next/server";
import { isBetterAuthGoogleConfigured } from "@/lib/server/betterAuth";
import { isGoogleConfigured } from "@/lib/server/googleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/providers — the public sign-in options surface. It
 * carries BOOLEANS ONLY (never a client id, never a secret): the
 * login and register pages ask it whether to render the "Continue
 * with Google" button, so an unwired environment shows the plain
 * email/password form and nothing that would 501 when tapped.
 *
 * Two doors during the Better Auth staging (AUTH DECISION
 * 2026-11-06): `betterAuthGoogle` — the Better Auth flow the button
 * now prefers; `google` — the legacy hand-rolled flow, still the
 * fallback while the Better Auth env is being wired.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    google: isGoogleConfigured(),
    betterAuthGoogle: isBetterAuthGoogleConfigured(),
  });
}
