import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError, isDatabaseConfigured, waitlistStore } from "@/lib/server/db";

/**
 * POST /api/waitlist — email-only waitlist capture (blueprint route `/`).
 *
 * WP3: real persistence behind an env check. With DATABASE_URL set, the
 * email lands in Neon `waitlist_signups` (Migration V2 §2) and this returns
 * 202 (the form's success contract). Without it, the handler fails HONESTLY
 * with the WP2 501 — validated, NOT stored, and it says so. Nothing is ever
 * fake-stored.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; source?: unknown; locale?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  const source =
    typeof body?.source === "string" && body.source.trim().length > 0 && body.source.length <= 64
      ? body.source.trim()
      : "homepage";
  const locale =
    typeof body?.locale === "string" && body.locale.length <= 10 ? body.locale : undefined;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: "database_not_configured",
        detail: "Email validated, NOT stored — waitlist persistence is not wired in this environment yet.",
      },
      { status: 501 },
    );
  }

  try {
    const result = await waitlistStore.addSignup({ email, source, locale });
    return NextResponse.json(
      { status: "stored", duplicate: result.duplicate, id: result.id },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { status: "unavailable", error: "database_not_configured", detail: "Email validated, NOT stored." },
        { status: 501 },
      );
    }
    return NextResponse.json(
      { status: "error", error: "storage_failed", detail: "The signup could not be stored. Nothing was saved." },
      { status: 503 },
    );
  }
}
