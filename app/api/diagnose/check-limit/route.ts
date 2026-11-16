import { NextResponse } from "next/server";
import { quotaOf } from "@/lib/server/authService";
import { apiError } from "@/lib/server/http";
import { AuthNotConfiguredError, bearerPayload, isAuthConfigured } from "@/lib/server/jwt";
import { FREE_DIAGNOSIS_LIMIT, countdownMessage } from "@/lib/server/quota";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/diagnose/check-limit — parity with the repo's
 * POST /api/diagnoses/check-limit, upgraded to the owner's rules:
 * the count is LIFETIME (no monthly reset), read from the server-side
 * record. Legacy fields (count/limit/canDiagnose/plan) are preserved;
 * WP5 adds remaining + lifetime + the countdown message.
 */
export async function POST(request: Request) {
  try {
    if (!isAuthConfigured()) throw new AuthNotConfiguredError();
    const payload = bearerPayload(request);
    if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const user = await getIdentityStore().findUserById(payload.id);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const quota = quotaOf(user);
    return NextResponse.json({
      count: quota.used,
      limit: quota.limit ?? Number.MAX_SAFE_INTEGER,
      freeLimit: FREE_DIAGNOSIS_LIMIT,
      remaining: quota.remaining,
      canDiagnose: quota.canDiagnose,
      plan: quota.plan,
      lifetime: true,
      message: countdownMessage(quota.remaining),
    });
  } catch (err) {
    return apiError(err);
  }
}
