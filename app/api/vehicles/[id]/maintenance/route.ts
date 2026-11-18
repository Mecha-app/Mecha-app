import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { getMaintenance, recordServiceMark } from "@/lib/server/maintenanceService";
import { requireAuth } from "@/lib/server/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/vehicles/[id]/maintenance — the Health Vault's maintenance
 * reminders for one vehicle (Pass #20; migration 0018). GET returns
 * the computed reminder states (from the vehicle's mileage + the
 * owner's own "last done" marks); POST records a mark. Owner-scoped
 * on both verbs, in the vehicle routes' pattern.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const result = await getMaintenance(getAppStore(), auth.payload.id, id);
    return NextResponse.json({
      status: "ok",
      mileage: result.mileage,
      items: result.states.map((s) => ({
        key: s.item.key,
        label: s.item.label,
        intervalMiles: s.item.intervalMiles,
        intervalMonths: s.item.intervalMonths,
        status: s.status,
        milesLeft: s.milesLeft,
        daysLeft: s.daysLeft,
        lastMileage: s.mark?.lastMileage ?? null,
        lastDate: s.mark?.lastDate ?? null,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
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
    const mark = await recordServiceMark(getAppStore(), auth.payload.id, id, body);
    return NextResponse.json({ status: "ok", mark }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
