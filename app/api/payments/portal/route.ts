import { NextResponse } from "next/server";
import { NoBillingAccountError, openBillingPortal } from "@/lib/server/billingService";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { StripeNotConfiguredError, getStripeClient } from "@/lib/server/stripe";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/portal — the manage/cancel-anytime door (owner
 * spec, Nov 3 2026). Creates a Stripe Billing Portal session for the
 * signed-in account's OWN Stripe customer (the id comes from the
 * persisted record, never from the request) and returns its URL; the
 * portal is where the subscriber changes plan, updates their card, or
 * cancels — effective at period end, no fees, no phone calls.
 *
 * Honest states, same discipline as create-checkout:
 *   - auth not wired / no session → 501 / 401 (requireAuth)
 *   - Stripe not wired            → 501 stripe_not_configured
 *   - account has never checked out (no Stripe customer on file)
 *                                 → 409 no_billing_account
 * No URL is ever fabricated.
 */
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if ("response" in auth) return auth.response;
  try {
    const result = await openBillingPortal(
      getIdentityStore(),
      getStripeClient(),
      auth.payload,
    );
    return NextResponse.json({ status: "ok", url: result.url });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        {
          status: "unavailable",
          error: err.code,
          detail: "Payments are not wired in this environment yet — billing management is unavailable.",
        },
        { status: 501 },
      );
    }
    if (err instanceof NoBillingAccountError) {
      return NextResponse.json({ error: err.code, detail: err.message }, { status: 409 });
    }
    return apiError(err);
  }
}
