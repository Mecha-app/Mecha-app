import { NextResponse } from "next/server";
import { quotaOf } from "@/lib/server/authService";
import { apiError } from "@/lib/server/http";
import { FREE_DIAGNOSIS_LIMIT, countdownMessage } from "@/lib/server/quota";
import { requireDriverUser } from "@/lib/server/routeAuth";
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
    // Same account gate as /api/diagnose (requireDriverUser): the
    // quota record belongs to a signed-in driver account — anonymous
    // and wrong-account calls are refused 401 before any lookup.
    const auth = await requireDriverUser(request, () => getIdentityStore());
    if ("response" in auth) return auth.response;
    const quota = quotaOf(auth.user);
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
