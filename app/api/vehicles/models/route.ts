import { NextResponse } from "next/server";
import { fetchModelsForMakeYear } from "@/lib/server/nhtsa";
import { requireAuth } from "@/lib/server/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/vehicles/models?make=<make>&year=<yyyy> — the model list
 * behind the manual add-a-vehicle form's cascading select (Scan
 * redesign, 2026-11-20): vPIC's GetModelsForMakeYear, server-side
 * like every NHTSA feed. `models: null` means vPIC could not be
 * reached (the form falls back to free entry); an empty list is
 * vPIC's real answer for that year+make (free entry too). A bad
 * year is a 400 — the form only ever sends select values, so a
 * malformed one is a caller bug, not data.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  const make = (url.searchParams.get("make") ?? "").trim();
  const year = (url.searchParams.get("year") ?? "").trim();
  if (!make || make.length > 80) {
    return NextResponse.json(
      { error: "invalid_make", detail: 'A "make" is required.' },
      { status: 400 },
    );
  }
  if (!/^(19|20)\d{2}$/.test(year)) {
    return NextResponse.json(
      { error: "invalid_year", detail: 'A 4-digit "year" is required.' },
      { status: 400 },
    );
  }
  const models = await fetchModelsForMakeYear(make, year);
  return NextResponse.json({ status: "ok", models });
}
