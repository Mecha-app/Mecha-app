import { createHmac, timingSafeEqual } from "node:crypto";
import type { AccountType } from "./jwt";
import type { IdentityStore } from "./store";

/**
 * Stripe (WP5) — the existing integration, preserved and fixed.
 *
 * Preserved from the repo (backend/src/routes/payments.js): subscription
 * checkout sessions, card only, Pro price for drivers / Business price
 * for shops, success/cancel URLs from CLIENT_URL, plan applied on
 * `checkout.session.completed`. Env names are the legacy ones.
 *
 * THE TWO LEGACY BUGS, FIXED HERE:
 *   (a) create-checkout read `req.user.email` — but the JWT payload is
 *       {id, type} only, so customer_email was always undefined. The
 *       checkout route in this rebuild loads the account RECORD from the
 *       database and takes the email from there (see the route).
 *   (b) the webhook updated ONLY the User collection, so a shop's
 *       $149 business-plan payment could never be recorded. The webhook
 *       service below dispatches on the checkout metadata's accountType
 *       and updates drivers, shops, and towing companies alike.
 *
 * Implemented over Stripe's REST API + manual webhook-signature
 * verification (HMAC-SHA256, the documented v1 scheme) so the rebuild
 * carries no extra SDK dependency; the client is an interface so tests
 * run against a stub and never touch Stripe.
 */

export class StripeNotConfiguredError extends Error {
  readonly code = "stripe_not_configured";
  constructor() {
    super("STRIPE_SECRET_KEY is not set — payments are not wired in this environment.");
    this.name = "StripeNotConfiguredError";
  }
}

export function isStripeConfigured(): boolean {
  return typeof process.env.STRIPE_SECRET_KEY === "string" && process.env.STRIPE_SECRET_KEY.length > 0;
}

export interface CheckoutSessionInput {
  priceId: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface StripeCheckoutEvent {
  type: string;
  session: {
    id: string;
    customer: string | null;
    metadata: Record<string, string>;
  };
}

export interface StripeClient {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
  /** Verify the webhook signature and normalize the event; throws on a bad signature. */
  constructEvent(rawBody: string, signatureHeader: string): StripeCheckoutEvent;
}

// ---------------------------------------------------------------------------
// REST client
// ---------------------------------------------------------------------------

export class HttpStripeClient implements StripeClient {
  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }> {
    if (!isStripeConfigured()) throw new StripeNotConfiguredError();
    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("payment_method_types[0]", "card");
    form.set("line_items[0][price]", input.priceId);
    form.set("line_items[0][quantity]", "1");
    form.set("customer_email", input.customerEmail);
    form.set("success_url", input.successUrl);
    form.set("cancel_url", input.cancelUrl);
    for (const [k, v] of Object.entries(input.metadata)) form.set(`metadata[${k}]`, v);

    const auth = Buffer.from(`${process.env.STRIPE_SECRET_KEY as string}:`).toString("base64");
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !data.id || !data.url) {
      throw new Error(`stripe_http_${res.status}: ${data.error?.message ?? "unknown"}`);
    }
    return { id: data.id, url: data.url };
  }

  constructEvent(rawBody: string, signatureHeader: string): StripeCheckoutEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || secret.length === 0) throw new StripeNotConfiguredError();
    let timestamp = "";
    const signatures: string[] = [];
    for (const part of signatureHeader.split(",")) {
      const [k, v] = part.split("=", 2);
      if (k === "t") timestamp = v;
      if (k === "v1" && v) signatures.push(v);
    }
    if (!timestamp || signatures.length === 0) throw new Error("stripe_signature_invalid");
    const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
    const expectedBuf = Buffer.from(expected);
    const ok = signatures.some((sig) => {
      const buf = Buffer.from(sig);
      return buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf);
    });
    if (!ok) throw new Error("stripe_signature_invalid");
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (Number.isFinite(ageSeconds) && ageSeconds > 300) throw new Error("stripe_signature_stale");

    const parsed = JSON.parse(rawBody) as {
      type?: string;
      data?: { object?: { id?: string; customer?: string | null; metadata?: Record<string, string> } };
    };
    const obj = parsed.data?.object ?? {};
    return {
      type: parsed.type ?? "",
      session: {
        id: obj.id ?? "",
        customer: typeof obj.customer === "string" ? obj.customer : null,
        metadata: obj.metadata ?? {},
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Stub client (tests) — records sessions, replays a canned event.
// ---------------------------------------------------------------------------

export class StubStripeClient implements StripeClient {
  readonly sessions: CheckoutSessionInput[] = [];
  event: StripeCheckoutEvent = { type: "", session: { id: "", customer: null, metadata: {} } };

  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }> {
    this.sessions.push(input);
    return { id: `cs_test_${this.sessions.length}`, url: "https://checkout.stripe.test/session" };
  }

  constructEvent(_rawBody: string, _signatureHeader: string): StripeCheckoutEvent {
    return this.event;
  }
}

// ---------------------------------------------------------------------------
// Checkout + webhook services (shared by the routes and the tests)
// ---------------------------------------------------------------------------

export function priceIdForPlan(plan: string): string | null {
  if (plan === "pro") return process.env.STRIPE_PRO_PRICE_ID ?? null;
  if (plan === "business") return process.env.STRIPE_BUSINESS_PRICE_ID ?? null;
  return null;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

/**
 * Create a subscription checkout for an authenticated account.
 * `accountEmail` MUST come from the persisted record (bug (a) fix) —
 * this function never sees a token payload.
 */
export async function createSubscriptionCheckout(input: {
  stripe: StripeClient;
  accountId: string;
  accountType: AccountType;
  accountEmail: string;
  plan: "pro" | "business";
}): Promise<CheckoutResult> {
  const priceId = priceIdForPlan(input.plan);
  if (!priceId) throw new StripeNotConfiguredError();
  const clientUrl = process.env.CLIENT_URL ?? "";
  const session = await input.stripe.createCheckoutSession({
    priceId,
    customerEmail: input.accountEmail,
    successUrl: `${clientUrl}/dashboard?success=true`,
    cancelUrl: `${clientUrl}/#pricing`,
    metadata: {
      accountId: input.accountId,
      accountType: input.accountType,
      // Legacy webhooks keyed on `userId`/`plan`; both are carried so a
      // mixed-traffic cutover stays readable either way.
      userId: input.accountId,
      plan: input.plan,
    },
  });
  return { url: session.url, sessionId: session.id };
}

/**
 * Apply a verified Stripe event. On checkout.session.completed the
 * paying account — driver, shop, or towing — gets its plan (bug (b)
 * fix). Returns true when an account was updated.
 */
export async function handleStripeEvent(
  store: IdentityStore,
  event: StripeCheckoutEvent,
): Promise<boolean> {
  if (event.type !== "checkout.session.completed") return false;
  const meta = event.session.metadata;
  const accountId = meta.accountId ?? meta.userId;
  const plan = meta.plan;
  if (!accountId || !plan) return false;
  const accountType: AccountType =
    meta.accountType === "shop" || meta.accountType === "towing" ? meta.accountType : "driver";
  return store.applyPlanUpdate({
    accountType,
    accountId,
    plan,
    stripeCustomerId: event.session.customer,
  });
}

/** Production client, or null when Stripe is not wired (honest 501). */
export function getStripeClient(): StripeClient | null {
  return isStripeConfigured() ? new HttpStripeClient() : null;
}
