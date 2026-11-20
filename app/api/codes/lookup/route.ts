import { NextResponse } from "next/server";
import { ValidationError } from "@/lib/server/authService";
import { codeStructure, faultCodePage } from "@/lib/server/faultCodes";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/codes/lookup — the fault-code door of the shop diagnose
 * panel (2026-11-20): look a code up in the same catalog the public
 * /codes pages render. A catalogued code returns its full entry
 * (title, plain-language meaning, urgency, driving note); a valid
 * but uncatalogued code returns its structural facts only — the
 * panel says plainly it is not in the catalog yet, and the code can
 * still go into a diagnosis. A malformed code is refused.
 */
export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver", "shop"]);
  if ("response" in auth) return auth.response;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  const raw = typeof body.code === "string" ? body.code : "";
  const structure = codeStructure(raw);
  if (!structure) {
    return apiError(
      new ValidationError('"code" could not be read — a fault code looks like P0420.'),
    );
  }
  return NextResponse.json({
    status: "ok",
    code: structure.code,
    system: structure.system,
    scope: structure.scope,
    entry: faultCodePage(raw),
  });
}
