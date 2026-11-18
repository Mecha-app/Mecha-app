import { NextResponse } from "next/server";
import { getBillingView, getCreditsView } from "@/lib/server/billingService";
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
 * The credit-model state rides beside it as `credits` (free
 * remaining, the monthly bucket, purchased singles — migration 0019).
 */
export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const store = getIdentityStore();
    const billing = await getBillingView(store, auth.payload);
    const credits = await getCreditsView(store, auth.payload);
    return NextResponse.json({ status: "ok", billing, credits });
  } catch (err) {
    return apiError(err);
  }
}
