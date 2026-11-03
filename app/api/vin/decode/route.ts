import { NextResponse } from "next/server";
import { apiError, readJsonBody } from "@/lib/server/http";
import { decodeVin, fetchRecalls } from "@/lib/server/nhtsa";
import { requireAuth } from "@/lib/server/routeAuth";
import { ValidationError } from "@/lib/server/authService";
import { normalizeVin } from "@/lib/server/vehicleService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/vin/decode — VIN enrichment (FEATURE_RESEARCH #1): decode
 * the VIN through NHTSA vPIC and attach the model's open recalls,
 * both fetched server-side from the free government APIs. When NHTSA
 * is unreachable the response says so (`enrichment: null`) — the VIN
 * itself was still validated locally, and nothing is invented.
 */
export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  const vin = normalizeVin(body.vin);
  if (!vin) {
    return apiError(
      new ValidationError('"vin" could not be read — check the 17 characters and try again.'),
    );
  }
  const decoded = await decodeVin(vin);
  if (!decoded) {
    return NextResponse.json({
      status: "ok",
      vin,
      enrichment: null,
      recalls: null,
      detail: "The national vehicle database didn't answer just now — your VIN is saved as entered.",
    });
  }
  const recalls =
    decoded.make && decoded.model && decoded.year
      ? await fetchRecalls({ make: decoded.make, model: decoded.model, year: decoded.year })
      : null;
  return NextResponse.json({
    status: "ok",
    vin,
    enrichment: decoded,
    recalls,
  });
}
