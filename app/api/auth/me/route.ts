import { NextResponse } from "next/server";
import { publicUser, quotaOf } from "@/lib/server/authService";
import { apiError } from "@/lib/server/http";
import { bearerPayload, isAuthConfigured, AuthNotConfiguredError } from "@/lib/server/jwt";
import { countdownMessage } from "@/lib/server/quota";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — the signed-in account + its live quota state.
 * This is where the app reads the free-diagnosis countdown on load:
 * the number comes from the server record, never from the browser.
 */
export async function GET(request: Request) {
  try {
    if (!isAuthConfigured()) throw new AuthNotConfiguredError();
    const payload = bearerPayload(request);
    if (!payload) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const user = await getIdentityStore().findUserById(payload.id);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const quota = quotaOf(user);
    return NextResponse.json({
      status: "ok",
      user: publicUser(user),
      quota,
      message: countdownMessage(quota.remaining),
    });
  } catch (err) {
    return apiError(err);
  }
}
