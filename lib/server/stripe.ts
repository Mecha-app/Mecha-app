import { createHmac, timingSafeEqual } from "node:crypto";
import type { AccountType } from "./jwt";
import type { IdentityStore } from "./store";
import {
  PRO_MONTHLY_CREDITS,
  PRO_PLAN_PRICE_CENTS,
  SHOP_MONTHLY_CREDITS,
  SHOP_PLAN_PRICE_CENTS,
  diagnosisPriceCents,
} from "./pricing";

/**
 * Stripe (WP5) — the existing integration, preserved and fixed.
 *
 * Preserved from the repo (backend/src/routes/payments.js): subscription
 * checkout sessions, Pro price for drivers / Business price for shops,
 * success/cancel URLs from CLIENT_URL, plan applied on
 * `checkout.session.completed`. Env names are the legacy ones.
 *
 * ONE DELIBERATE DEPARTURE (owner spec, Nov 3 2026): the repo restricted
 * sessions to `payment_method_types: ["card"]`. The rebuild sends NO
 * payment_method_types at all — an unrestricted session lets Stripe
 * Checkout surface every payment method enabled on the account, which
 * is how Apple Pay and Google Pay appear next to the card fields. The
 * wallet toggles themselves live in the Stripe dashboard (Settings →
 * Payments) and are confirmed at wiring time (STATUS.md checklist).
 *
 * Billing management (same owner spec): subscribers manage or cancel
 * anytime through the Stripe Billing Portal (createBillingPortalSession
 * below + /api/payments/portal), and the webhook also persists the
 * subscription lifecycle (status, current period end, cancel flag —
 * migration 0010) so the account screens can state them in plain words.
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

export interface PortalSessionInput {
  customerId: string;
  returnUrl: string;
}

/**
 * An INLINE-price checkout (Stripe pass, 2026-11-18): the price is
 * carried in price_data on the session itself, so NO pre-created
 * Stripe price objects are needed — the amounts come from
 * lib/server/pricing.ts and the flow goes live the moment the keys
 * exist, with no dashboard setup. `kind` rides in the metadata so the
 * webhook can tell a one-time credit purchase from a subscription.
 */
export interface InlineCheckoutSessionInput {
  mode: "payment" | "subscription";
  /** The unit amount, in cents — the price_data amount. */
  amountCents: number;
  /** price_data product name, as the customer sees it at checkout. */
  productName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

/** A customer.subscription.* event, normalized (migration 0010 fields). */
export interface StripeSubscriptionData {
  id: string;
  customer: string | null;
  /** Stripe's status verbatim: active, past_due, canceled, … */
  status: string;
  /** ISO timestamp, or null when Stripe didn't carry one. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  metadata: Record<string, string>;
}

export interface StripeCheckoutEvent {
  type: string;
  session: {
    id: string;
    customer: string | null;
    /** The subscription the checkout created, when Stripe reports it. */
    subscription?: string | null;
    metadata: Record<string, string>;
  };
  /** Present on customer.subscription.* events. */
  subscription?: StripeSubscriptionData;
}

export interface StripeClient {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
  createInlineCheckoutSession(
    input: InlineCheckoutSessionInput,
  ): Promise<{ id: string; url: string }>;
  createBillingPortalSession(input: PortalSessionInput): Promise<{ id: string; url: string }>;
  /** Verify the webhook signature and normalize the event; throws on a bad signature. */
  constructEvent(rawBody: string, signatureHeader: string): StripeCheckoutEvent;
}

// ---------------------------------------------------------------------------
// REST client
// ---------------------------------------------------------------------------

/**
 * The checkout session's wire parameters, built as a pure function so
 * the test-suite can assert on exactly what would be sent to Stripe.
 * WALLET RULE (owner spec): there is deliberately NO
 * `payment_method_types` entry — see the header note.
 */
export function buildCheckoutSessionForm(input: CheckoutSessionInput): URLSearchParams {
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", input.priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("customer_email", input.customerEmail);
  form.set("success_url", input.successUrl);
  form.set("cancel_url", input.cancelUrl);
  for (const [k, v] of Object.entries(input.metadata)) form.set(`metadata[${k}]`, v);
  return form;
}

/**
 * The inline-price session's wire parameters — also a pure builder,
 * also with NO `payment_method_types` (the wallet rule above). A
 * one-time session asks Stripe to always create a customer so the
 * webhook can record who paid; a subscription session repeats the
 * metadata onto the SUBSCRIPTION itself, because the lifecycle events
 * carry the subscription's metadata, not the checkout's — that is
 * how renewals and cancellations find their plan.
 */
export function buildInlineCheckoutSessionForm(
  input: InlineCheckoutSessionInput,
): URLSearchParams {
  const form = new URLSearchParams();
  form.set("mode", input.mode);
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
  form.set("line_items[0][price_data][product_data][name]", input.productName);
  if (input.mode === "subscription") {
    form.set("line_items[0][price_data][recurring][interval]", "month");
  } else {
    form.set("customer_creation", "always");
  }
  form.set("line_items[0][quantity]", "1");
  form.set("customer_email", input.customerEmail);
  form.set("success_url", input.successUrl);
  form.set("cancel_url", input.cancelUrl);
  for (const [k, v] of Object.entries(input.metadata)) {
    form.set(`metadata[${k}]`, v);
    if (input.mode === "subscription") form.set(`subscription_data[metadata][${k}]`, v);
  }
  return form;
}

async function stripePost(
  path: string,
  form: URLSearchParams,
): Promise<{ id: string; url: string }> {
  if (!isStripeConfigured()) throw new StripeNotConfiguredError();
  const auth = Buffer.from(`${process.env.STRIPE_SECRET_KEY as string}:`).toString("base64");
  const res = await fetch(`https://api.stripe.com${path}`, {
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

export class HttpStripeClient implements StripeClient {
  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }> {
    return stripePost("/v1/checkout/sessions", buildCheckoutSessionForm(input));
  }

  async createInlineCheckoutSession(
    input: InlineCheckoutSessionInput,
  ): Promise<{ id: string; url: string }> {
    return stripePost("/v1/checkout/sessions", buildInlineCheckoutSessionForm(input));
  }

  async createBillingPortalSession(
    input: PortalSessionInput,
  ): Promise<{ id: string; url: string }> {
    const form = new URLSearchParams();
    form.set("customer", input.customerId);
    form.set("return_url", input.returnUrl);
    return stripePost("/v1/billing_portal/sessions", form);
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
      data?: {
        object?: {
          id?: string;
          customer?: string | null;
          subscription?: string | null;
          status?: string;
          current_period_end?: number | null;
          cancel_at_period_end?: boolean;
          items?: {
            data?: Array<{
              current_period_end?: number | null;
              price?: { id?: string };
            }>;
          };
          metadata?: Record<string, string>;
        };
      };
    };
    const obj = parsed.data?.object ?? {};
    const type = parsed.type ?? "";
    const event: StripeCheckoutEvent = {
      type,
      session: {
        id: obj.id ?? "",
        customer: typeof obj.customer === "string" ? obj.customer : null,
        subscription: typeof obj.subscription === "string" ? obj.subscription : null,
        metadata: obj.metadata ?? {},
      },
    };
    if (type.startsWith("customer.subscription.")) {
      // The payload IS the subscription. current_period_end sits on the
      // object in classic API versions and on the first item in newer
      // ones — read both rather than pinning an API version.
      const periodEnd = obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end ?? null;
      event.subscription = {
        id: obj.id ?? "",
        customer: typeof obj.customer === "string" ? obj.customer : null,
        status: obj.status ?? "",
        currentPeriodEnd:
          typeof periodEnd === "number" && Number.isFinite(periodEnd)
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        cancelAtPeriodEnd: obj.cancel_at_period_end === true,
        priceId: obj.items?.data?.[0]?.price?.id ?? null,
        metadata: obj.metadata ?? {},
      };
    }
    return event;
  }
}

// ---------------------------------------------------------------------------
// Stub client (tests) — records sessions, replays a canned event.
// ---------------------------------------------------------------------------

export class StubStripeClient implements StripeClient {
  readonly sessions: CheckoutSessionInput[] = [];
  readonly inlineSessions: InlineCheckoutSessionInput[] = [];
  readonly portalSessions: PortalSessionInput[] = [];
  event: StripeCheckoutEvent = { type: "", session: { id: "", customer: null, metadata: {} } };

  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }> {
    this.sessions.push(input);
    return { id: `cs_test_${this.sessions.length}`, url: "https://checkout.stripe.test/session" };
  }

  async createInlineCheckoutSession(
    input: InlineCheckoutSessionInput,
  ): Promise<{ id: string; url: string }> {
    this.inlineSessions.push(input);
    return {
      id: `cs_test_inline_${this.inlineSessions.length}`,
      url: "https://checkout.stripe.test/session",
    };
  }

  async createBillingPortalSession(
    input: PortalSessionInput,
  ): Promise<{ id: string; url: string }> {
    this.portalSessions.push(input);
    return {
      id: `bps_test_${this.portalSessions.length}`,
      url: "https://billing.stripe.test/portal",
    };
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

/** Inverse of priceIdForPlan — subscription events name a price, not a plan. */
export function planForPriceId(priceId: string): string | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return "business";
  return null;
}

/** Each actor's no-subscription plan (what a deleted subscription returns to). */
export function freePlanFor(accountType: AccountType): string {
  return accountType === "towing" ? "starter" : "free";
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

// ---------------------------------------------------------------------------
// The credit model (Stripe pass, 2026-11-18) — inline-price checkouts.
// Amounts come from lib/server/pricing.ts; no pre-created Stripe price
// objects exist or are needed. Metadata contract the webhook reads:
//   kind: "diagnosis_credit" | "subscription"
//   plan: "pro" | "business"   (subscriptions)
//   accountId / userId / accountType — the legacy keys, unchanged.
// ---------------------------------------------------------------------------

/**
 * ONE diagnosis credit for a driver (mode=payment). Purchasable by
 * anyone — a free driver at the paywall, or a Pro subscriber topping
 * up an exhausted monthly bucket. The credit lands ONLY through the
 * verified webhook (grantDiagnosisCredit), never at session creation:
 * an abandoned checkout grants nothing.
 */
export async function createDiagnosisCreditCheckout(input: {
  stripe: StripeClient;
  accountId: string;
  accountEmail: string;
}): Promise<CheckoutResult> {
  const clientUrl = process.env.CLIENT_URL ?? "";
  const session = await input.stripe.createInlineCheckoutSession({
    mode: "payment",
    amountCents: diagnosisPriceCents(),
    productName: "MECHA — 1 diagnosis credit",
    customerEmail: input.accountEmail,
    successUrl: `${clientUrl}/app/diagnose?checkout=success`,
    cancelUrl: `${clientUrl}/app/diagnose`,
    metadata: {
      kind: "diagnosis_credit",
      accountId: input.accountId,
      accountType: "driver",
      userId: input.accountId,
    },
  });
  return { url: session.url, sessionId: session.id };
}

/**
 * Pro for a driver: $9.99/month = a bucket of 100 diagnosis credits
 * per month (pricing.ts). Activation and each renewal refill the
 * bucket in the webhook; cancellation ends the plan (and the bucket)
 * through the lifecycle events.
 */
export async function createProSubscriptionCheckout(input: {
  stripe: StripeClient;
  accountId: string;
  accountEmail: string;
}): Promise<CheckoutResult> {
  const clientUrl = process.env.CLIENT_URL ?? "";
  const session = await input.stripe.createInlineCheckoutSession({
    mode: "subscription",
    amountCents: PRO_PLAN_PRICE_CENTS,
    productName: `MECHA Pro — ${PRO_MONTHLY_CREDITS} diagnoses a month`,
    customerEmail: input.accountEmail,
    successUrl: `${clientUrl}/app?checkout=success`,
    cancelUrl: `${clientUrl}/pricing`,
    metadata: {
      kind: "subscription",
      accountId: input.accountId,
      accountType: "driver",
      userId: input.accountId,
      plan: "pro",
    },
  });
  return { url: session.url, sessionId: session.id };
}

/**
 * The business plan for a shop (or a towing company, which buys the
 * same listing plan): $149/month. For shops it carries the bucket of
 * 500 diagnosis credits per month (pricing.ts); activation refills it
 * in the webhook, on top of the shop's 10 free diagnoses at signup.
 */
export async function createShopSubscriptionCheckout(input: {
  stripe: StripeClient;
  accountId: string;
  accountType: "shop" | "towing";
  accountEmail: string;
}): Promise<CheckoutResult> {
  const clientUrl = process.env.CLIENT_URL ?? "";
  const session = await input.stripe.createInlineCheckoutSession({
    mode: "subscription",
    amountCents: SHOP_PLAN_PRICE_CENTS,
    productName: `MECHA for Shops — ${SHOP_MONTHLY_CREDITS} diagnoses a month`,
    customerEmail: input.accountEmail,
    successUrl: `${clientUrl}/app?checkout=success`,
    cancelUrl: `${clientUrl}/pricing`,
    metadata: {
      kind: "subscription",
      accountId: input.accountId,
      accountType: input.accountType,
      userId: input.accountId,
      plan: "business",
    },
  });
  return { url: session.url, sessionId: session.id };
}

/**
 * Apply a verified Stripe event. Returns true when an account was
 * updated.
 *
 * checkout.session.completed — the paying account (driver, shop, or
 * towing; bug (b) fix) gets its plan, customer id, and the id of the
 * subscription the checkout created.
 *
 * customer.subscription.created/updated/deleted — the lifecycle truth
 * the billing screens display (migration 0010): status, current period
 * end, cancel-at-period-end. These events carry NO checkout metadata —
 * the account is resolved by the Stripe customer id (with the
 * subscription's own metadata honored when present). A deleted
 * subscription returns the account to its free plan; the plan on other
 * events comes from the subscription's price when it is one of ours.
 */
export async function handleStripeEvent(
  store: IdentityStore,
  event: StripeCheckoutEvent,
): Promise<boolean> {
  if (event.type === "checkout.session.completed") {
    const meta = event.session.metadata;
    const accountId = meta.accountId ?? meta.userId;

    // A one-time diagnosis-credit purchase: grant exactly one credit,
    // idempotently — the ledger's UNIQUE session id makes a replayed
    // delivery a no-op (store.grantDiagnosisCredit). The Stripe
    // customer id is recorded on the account for later checkouts.
    if (meta.kind === "diagnosis_credit") {
      if (!accountId) return false;
      await store.grantDiagnosisCredit(accountId, event.session.id);
      if (event.session.customer) {
        await store.applyPlanUpdate({
          accountType: "driver",
          accountId,
          plan: null,
          stripeCustomerId: event.session.customer,
        });
      }
      return true;
    }

    const plan = meta.plan;
    if (!accountId || !plan) return false;
    const accountType: AccountType =
      meta.accountType === "shop" || meta.accountType === "towing" ? meta.accountType : "driver";
    const applied = await store.applyPlanUpdate({
      accountType,
      accountId,
      plan,
      stripeCustomerId: event.session.customer,
      stripeSubscriptionId: event.session.subscription ?? null,
    });
    // Activation fills the monthly bucket: Pro drivers get their 100,
    // shops their 500. (Towing buys the listing plan only — no bucket.)
    // The fill happens only on the FIRST application of this checkout
    // session (0020): Stripe retries webhook deliveries, and a replay
    // must never reset a partially used bucket — that would be a
    // second grant. The plan update above is idempotent and may
    // safely re-run; renewals refill through the subscription
    // lifecycle events and the lazy consume-time reset, not here.
    if (applied) {
      const firstApplication = await store.markCheckoutSessionApplied(event.session.id);
      if (firstApplication && plan === "pro" && accountType === "driver") {
        await store.resetMonthlyBucket("user", accountId, new Date());
      }
      if (firstApplication && plan === "business" && accountType === "shop") {
        await store.resetMonthlyBucket("shop", accountId, new Date());
      }
    }
    return applied;
  }

  if (event.type.startsWith("customer.subscription.") && event.subscription) {
    const sub = event.subscription;
    if (!sub.customer) return false;
    let target: { accountType: AccountType; accountId: string } | null = null;
    const metaAccountId = sub.metadata.accountId ?? sub.metadata.userId;
    if (metaAccountId) {
      const t = sub.metadata.accountType;
      target = {
        accountType: t === "shop" || t === "towing" ? t : "driver",
        accountId: metaAccountId,
      };
    } else {
      target = await store.findAccountByStripeCustomerId(sub.customer);
    }
    if (!target) return false;
    const deleted = event.type === "customer.subscription.deleted";
    // The plan: the subscription's own metadata first (inline-price
    // checkouts repeat it there — their generated price ids are not
    // in the env), then the legacy price-id mapping.
    const metaPlan =
      sub.metadata.plan === "pro" || sub.metadata.plan === "business" ? sub.metadata.plan : null;
    const plan = deleted
      ? freePlanFor(target.accountType)
      : (metaPlan ?? (sub.priceId ? planForPriceId(sub.priceId) : null));

    // Renewal detection BEFORE the update lands: a live subscription
    // whose period end ADVANCED past the stored one has rolled into a
    // new cycle — its bucket refills. (The lazy reset in the consume
    // path covers a missed webhook; this keeps the displayed bucket
    // exact the moment the renewal is known.)
    let periodAdvanced = false;
    if (!deleted && sub.currentPeriodEnd) {
      const stored =
        target.accountType === "driver"
          ? await store.findUserById(target.accountId)
          : target.accountType === "shop"
            ? await store.findShopById(target.accountId)
            : null;
      periodAdvanced =
        stored !== null &&
        stored.currentPeriodEnd !== null &&
        stored.currentPeriodEnd !== undefined &&
        sub.currentPeriodEnd > stored.currentPeriodEnd;
    }

    const applied = await store.applyPlanUpdate({
      accountType: target.accountType,
      accountId: target.accountId,
      plan,
      stripeCustomerId: sub.customer,
      stripeSubscriptionId: sub.id || null,
      subscriptionStatus: deleted ? "canceled" : sub.status || null,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: deleted ? false : sub.cancelAtPeriodEnd,
    });
    if (applied && periodAdvanced) {
      if (target.accountType === "driver" && plan === "pro") {
        await store.resetMonthlyBucket("user", target.accountId, new Date());
      }
      if (target.accountType === "shop" && plan === "business") {
        await store.resetMonthlyBucket("shop", target.accountId, new Date());
      }
    }
    return applied;
  }

  return false;
}

/** Production client, or null when Stripe is not wired (honest 501). */
export function getStripeClient(): StripeClient | null {
  return isStripeConfigured() ? new HttpStripeClient() : null;
}
