import { NextResponse } from "next/server";
import { apiError, readJsonBody } from "@/lib/server/http";
import { AuthNotConfiguredError, bearerPayload, isAuthConfigured } from "@/lib/server/jwt";
import {
  StripeNotConfiguredError,
  createSubscriptionCheckout,
  getStripeClient,
} from "@/lib/server/stripe";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/create-checkout — parity with the repo's
 * POST /api/payments/create-checkout (subscription session, card,
 * legacy price envs + URLs).
 *
 * LEGACY BUG FIXED: the repo read `customer_email` from req.user.email,
 * but the JWT payload is {id, type} — the value was always undefined.
 * Here the account RECORD is loaded from the database and the email is
 * taken from it. Drivers buy "pro"; shops buy "business".
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
    const plan = body.plan === "business" ? "business" : "pro";

    let accountEmail: string | null = null;
    if (payload.type === "driver") {
      const user = await store.findUserById(payload.id);
      accountEmail = user?.email ?? null;
    } else if (payload.type === "shop") {
      const shop = await store.findShopById(payload.id);
      accountEmail = shop?.email ?? null;
    }
    if (!accountEmail) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const result = await createSubscriptionCheckout({
      stripe,
      accountId: payload.id,
      accountType: payload.type,
      accountEmail,
      plan,
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
