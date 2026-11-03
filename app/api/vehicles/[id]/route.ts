import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { deleteVehicle, getVehicleDetail, updateVehicle } from "@/lib/server/vehicleService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/vehicles/[id] — one vault vehicle + its diagnosis history.
 * Every verb is owner-scoped: another driver's vehicle id answers
 * 404, exactly as if it didn't exist.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const detail = await getVehicleDetail(getAppStore(), auth.payload.id, id);
    return NextResponse.json({ status: "ok", ...detail });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const vehicle = await updateVehicle(getAppStore(), auth.payload.id, id, body);
    return NextResponse.json({ status: "ok", vehicle });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    await deleteVehicle(getAppStore(), auth.payload.id, id);
    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
