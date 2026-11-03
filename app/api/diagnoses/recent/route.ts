import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/diagnoses/recent — the dashboard's recent-diagnosis strip. */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  try {
    const diagnoses = await getAppStore().listRecentDiagnoses(auth.payload.id, 5);
    return NextResponse.json({ status: "ok", diagnoses });
  } catch (err) {
    return apiError(err);
  }
}
