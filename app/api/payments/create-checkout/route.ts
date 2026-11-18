import { NextResponse } from "next/server";
import { apiError, readJsonBody } from "@/lib/server/http";
import { AuthNotConfiguredError, bearerPayload, isAuthConfigured } from "@/lib/server/jwt";
import {
  StripeNotConfiguredError,
  createDiagnosisCreditCheckout,
  createProSubscriptionCheckout,
  createShopSubscriptionCheckout,
  createSubscriptionCheckout,
  getStripeClient,
} from "@/lib/server/stripe";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/create-checkout — starts a Stripe Checkout
 * session for the signed-in account. The session is NOT restricted
 * to card — no payment_method_types is sent, so Checkout surfaces
 * every method enabled on the account, including Apple Pay and
 * Google Pay (owner spec, Nov 3 2026).
 *
 * LEGACY BUG FIXED: the repo read `customer_email` from req.user.email,
 * but the JWT payload is {id, type} — the value was always undefined.
 * Here the account RECORD is loaded from the database and the email is
 * taken from it.
 *
 * THE CREDIT MODEL (Stripe pass, 2026-11-18): `plan` in the body is
 * the door the buyer chose —
 *   "credit"   a driver buys ONE diagnosis credit (one-time, inline
 *              price from pricing.ts; the credit lands via webhook)
 *   "pro"      a driver subscribes to Pro (100 credits/month bucket)
 *   "business" a shop/towing account subscribes ($149/month; shops
 *              carry the 500-credit monthly bucket)
 * All three use inline price_data — no pre-created Stripe prices.
 * With no plan in the body the route falls back to the LEGACY
 * price-id subscription flow (createSubscriptionCheckout), unchanged
 * for any caller still on it. No Stripe key → 501 with the honest
 * not-wired detail; nothing is ever half-created.
 */
export async function POST(request: Request) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    if (!isAuthConfigured()) throw new AuthNotConfiguredError();
    const payload = bearerPayload(request);
    if (!payload) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const stripe = getStripeClient();
    if (!stripe) throw new StripeNotConfiguredError();

    const store = getIdentityStore();

    let accountEmail: string | null = null;
    if (payload.type === "driver") {
      const user = await store.findUserById(payload.id);
      accountEmail = user?.email ?? null;
    } else if (payload.type === "shop") {
      const shop = await store.findShopById(payload.id);
      accountEmail = shop?.email ?? null;
    } else if (payload.type === "towing") {
      // Towing buys the same business plan (the /shops page sells to
      // both). This branch was missing: the webhook has always applied
      // towing payments, but a towing account could never START one —
      // closed 2026-11-14 in the tool-stack verification pass.
      const towing = await store.findTowingById(payload.id);
      accountEmail = towing?.email ?? null;
    }
    if (!accountEmail) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (body.plan === "credit") {
      // Single diagnosis credits are a driver product.
      if (payload.type !== "driver") {
        return NextResponse.json({ error: "not_available_for_account" }, { status: 400 });
      }
      const result = await createDiagnosisCreditCheckout({
        stripe,
        accountId: payload.id,
        accountEmail,
      });
      return NextResponse.json({ status: "ok", url: result.url, sessionId: result.sessionId });
    }

    if (body.plan === "pro") {
      if (payload.type !== "driver") {
        return NextResponse.json({ error: "not_available_for_account" }, { status: 400 });
      }
      const result = await createProSubscriptionCheckout({
        stripe,
        accountId: payload.id,
        accountEmail,
      });
      return NextResponse.json({ status: "ok", url: result.url, sessionId: result.sessionId });
    }

    if (body.plan === "business") {
      if (payload.type === "driver") {
        return NextResponse.json({ error: "not_available_for_account" }, { status: 400 });
      }
      const result = await createShopSubscriptionCheckout({
        stripe,
        accountId: payload.id,
        accountType: payload.type,
        accountEmail,
      });
      return NextResponse.json({ status: "ok", url: result.url, sessionId: result.sessionId });
    }

    // Legacy fallback: no recognized plan — the WP5 price-id flow.
    const result = await createSubscriptionCheckout({
      stripe,
      accountId: payload.id,
      accountType: payload.type,
      accountEmail,
      plan: "pro",
    });
    return NextResponse.json({ status: "ok", url: result.url, sessionId: result.sessionId });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        {
          status: "unavailable",
          error: err.code,
          detail: "Payments are not wired in this environment yet — no checkout was created.",
        },
        { status: 501 },
      );
    }
    return apiError(err);
  }
}
