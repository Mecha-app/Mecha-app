import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { getBusinessProfile, updateBusinessProfile } from "@/lib/server/businessService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/business/me — the signed-in shop/towing profile + plan state
 * (dashboard), and profile edits (PATCH). The account is whichever
 * business the session token names; there is no id in the URL, so one
 * business can never address another's profile through this route.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["shop", "towing"]);
  if ("response" in auth) return auth.response;
  try {
    const business = await getBusinessProfile(getAppStore(), auth.payload);
    return NextResponse.json({ status: "ok", business });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: Request) {
  const auth = requireAuth(request, ["shop", "towing"]);
  if ("response" in auth) return auth.response;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const business = await updateBusinessProfile(getAppStore(), auth.payload, body);
    return NextResponse.json({ status: "ok", business });
  } catch (err) {
    return apiError(err);
  }
}
