import { NextResponse } from "next/server";
import { verifyEmailWithCode } from "@/lib/server/accountCodes";
import { publicUser, quotaOf } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-email — confirm the signed-in account's email
 * with the 6-digit code sent at registration (or by a resend).
 *
 * SOFT GATE (owner's funnel): verification is never required to use
 * the account — it stamps email_verified_at, and the dashboard stops
 * showing the verify banner. Wrong/expired/exhausted codes all answer
 * the same generic 400 (InvalidCodeError).
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
    const user = await verifyEmailWithCode(getIdentityStore(), auth.payload.id, body.code);
    return NextResponse.json({
      status: "ok",
      user: publicUser(user),
      quota: quotaOf(user),
    });
  } catch (err) {
    return apiError(err);
  }
}
