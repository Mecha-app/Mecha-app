import { NextResponse } from "next/server";
import { completePhone } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/complete-phone — attach the phone number to the
 * signed-in driver account (profile completion for Google-created
 * accounts, which start phone-less). The number is checked against
 * the phone identity key exactly like registration: a number that
 * belongs to a DIFFERENT account answers the honest 409 conflict —
 * accounts are never merged silently. Success returns the standard
 * auth payload so the client refreshes its stored profile.
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
  try {
    const result = await completePhone(getIdentityStore(), auth.payload.id, body);
    return NextResponse.json({ status: "ok", ...result }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
