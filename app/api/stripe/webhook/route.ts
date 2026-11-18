import { NextResponse } from "next/server";
import { getStripeClient, handleStripeEvent } from "@/lib/server/stripe";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook — the canonical Stripe webhook endpoint
 * (Stripe pass, 2026-11-18). The handler is the same one
 * /api/payments/webhook has always run: the RAW body is
 * signature-verified against STRIPE_WEBHOOK_SECRET before anything
 * is applied, and a bad signature answers 400 having granted and
 * changed NOTHING. Verified events grant diagnosis credits
 * (idempotently, per checkout session), activate/renew/cancel the
 * Pro and Shops subscriptions, and refill monthly buckets.
 *
 * Point the Stripe dashboard's webhook endpoint at THIS path
 * (checkout.session.completed + customer.subscription.* events).
 * /api/payments/webhook stays live for any endpoint already
 * configured there — both run the identical verified handler.
 */

// Stripe's documented maximum event payload; anything larger is not a
// real event and never reaches the signature check.
const MAX_WEBHOOK_BYTES = 262_144;

export async function POST(request: Request) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 501 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }
  // RAW body — signature verification needs the exact bytes Stripe
  // signed; a parsed-then-reserialized body would never verify.
  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  let event;
  try {
    event = stripe.constructEvent(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const applied = await handleStripeEvent(getIdentityStore(), event);
  return NextResponse.json({ received: true, applied });
}
