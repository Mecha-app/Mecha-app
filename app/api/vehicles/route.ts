import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { createVehicle, listVehicles } from "@/lib/server/vehicleService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/vehicles — the signed-in driver's Health Vault vehicles. */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  try {
    const vehicles = await listVehicles(getAppStore(), auth.payload.id);
    return NextResponse.json({ status: "ok", vehicles });
  } catch (err) {
    return apiError(err);
  }
}

/** POST /api/vehicles — add a vehicle to the signed-in driver's vault. */
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
  try {
    const vehicle = await createVehicle(getAppStore(), auth.payload.id, body);
    return NextResponse.json({ status: "ok", vehicle }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
