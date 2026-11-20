import { NextResponse } from "next/server";
import { quotaOf } from "@/lib/server/authService";
import { shopCountdownMessage, shopQuotaStateFor } from "@/lib/server/credits";
import { apiError } from "@/lib/server/http";
import { bearerPayload } from "@/lib/server/jwt";
import { FREE_DIAGNOSIS_LIMIT, countdownMessage } from "@/lib/server/quota";
import { requireDriverUser, requireShopUser } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/diagnose/check-limit — parity with the repo's
 * POST /api/diagnoses/check-limit, upgraded to the owner's rules:
 * the count is LIFETIME (no monthly reset), read from the server-side
 * record. Legacy fields (count/limit/canDiagnose/plan) are preserved;
 * WP5 adds remaining + lifetime + the countdown message.
 *
 * SHOP accounts (2026-11-19) read their own state here: the trial
 * shelf (14 days / 25 credits) and, on the business plan, the
 * 500-credit monthly bucket — same response shape, shop numbers.
 */
export async function POST(request: Request) {
  try {
    let payload = null;
    try {
      payload = bearerPayload(request);
    } catch {
      payload = null;
    }
    if (payload?.type === "shop") {
      const auth = await requireShopUser(request, () => getIdentityStore());
      if ("response" in auth) return auth.response;
      const quota = shopQuotaStateFor(auth.shop);
      return NextResponse.json({
        count: quota.used,
        limit: quota.limit,
        freeLimit: quota.limit,
        remaining: quota.remaining,
        canDiagnose: quota.canDiagnose,
        plan: quota.plan,
        accountKind: "shop",
        trial: quota.trial,
        terms: quota.terms,
        free: quota.free,
        bucket: quota.bucket,
        message: shopCountdownMessage(quota),
      });
    }
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
      message: countdownMessage(quota),
    });
  } catch (err) {
    return apiError(err);
  }
}
