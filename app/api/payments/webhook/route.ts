import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/http";
import {
  StripeNotConfiguredError,
  getStripeClient,
  handleStripeEvent,
} from "@/lib/server/stripe";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook — Stripe webhook, signature-verified over
 * the RAW body (legacy contract).
 *
 * LEGACY BUG FIXED: the repo's webhook updated ONLY the User
 * collection, so a shop's business-plan payment was never recorded.
 * handleStripeEvent dispatches on the checkout metadata's accountType —
 * drivers, shops, and towing companies are all updated.
 *
 * CUTOVER NOTE (Migration V2 Phase F): the endpoint registered in the
 * Stripe dashboard must be repointed to this route at cutover, with a
 * test event confirmed — a checklist item, not an afterthought.
 */
export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    if (!stripe) throw new StripeNotConfiguredError();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "missing_signature" }, { status: 400 });
    }
    const rawBody = await request.text();
    // Sanity cap (security pass): genuine Stripe events are a few KB;
    // an oversized body is refused before any parsing or DB work.
    if (rawBody.length > 262_144) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    let event;
    try {
      event = stripe.constructEvent(rawBody, signature);
    } catch {
      return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
    }
    await handleStripeEvent(getIdentityStore(), event);
    return NextResponse.json({ received: true });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { status: "unavailable", error: err.code, detail: "Payments are not wired in this environment yet." },
        { status: 501 },
      );
    }
    return apiError(err);
  }
}
