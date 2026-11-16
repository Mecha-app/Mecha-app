import { NextResponse } from "next/server";
import { getBillingView } from "@/lib/server/billingService";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/status — the signed-in account's billing truth for
 * the dashboard's billing section: plan, subscription status, current
 * period end (the renewal date while active), and the cancel flag —
 * all read from the account record, which the Stripe webhook keeps
 * current (migration 0010). Works for drivers, shops, and towing.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const billing = await getBillingView(getIdentityStore(), auth.payload);
    return NextResponse.json({ status: "ok", billing });
  } catch (err) {
    return apiError(err);
  }
}
