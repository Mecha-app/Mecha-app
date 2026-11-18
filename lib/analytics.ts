/**
 * Analytics core (analytics pass, 2026-11-18) — the pure, shared half
 * of the GA4 + Clarity wiring. Everything here is environment-shaped
 * and side-effect free so the test suite can pin the contract:
 *
 *  - ENV-GATED, the house pattern (the Stripe pass): the three public
 *    ids come from NEXT_PUBLIC_GA_MEASUREMENT_ID,
 *    NEXT_PUBLIC_CLARITY_PROJECT_ID and NEXT_PUBLIC_GSC_VERIFICATION.
 *    Unset (or malformed) = the feature is ABSENT — no script tags in
 *    the layout, no verification meta, no events fired. Setting the
 *    vars in Vercel and redeploying turns it live with zero code
 *    change.
 *  - PAYLOAD HYGIENE: funnel events may carry exactly ONE parameter —
 *    `product`, from a closed allowlist. There is deliberately no way
 *    to attach an email, a VIN, a vehicle string, or diagnosis text
 *    to an event: sanitizeEventParams drops every other key, so a
 *    future call site cannot leak personal data into GA by accident.
 */

export const FUNNEL_EVENTS = [
  "diagnosis_started",
  "diagnosis_completed",
  "photo_scan_completed",
  "paywall_viewed",
  "checkout_started",
  "purchase_completed",
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

/** The only event parameter that exists, and its only legal values. */
export const CHECKOUT_PRODUCTS = ["single_credit", "pro", "business", "subscription"] as const;

export type CheckoutProduct = (typeof CHECKOUT_PRODUCTS)[number];

export interface AnalyticsConfig {
  /** GA4 measurement id (G-…), or null when analytics is off. */
  gaId: string | null;
  /** Microsoft Clarity project id, or null when Clarity is off. */
  clarityId: string | null;
  /** Google Search Console verification token, or null. */
  gscToken: string | null;
}

const GA_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;
const CLARITY_ID_PATTERN = /^[a-z0-9]{6,}$/i;

function cleanId(value: string | undefined, pattern: RegExp): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return pattern.test(trimmed) ? trimmed : null;
}

function cleanToken(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // A verification token is one opaque word — whitespace or quotes in
  // the value means a paste error, and a malformed meta tag is worse
  // than none.
  return trimmed.length > 0 && !/[\s"']/.test(trimmed) ? trimmed : null;
}

/**
 * Parse the analytics config out of an env-shaped record. Pure: the
 * caller passes the record (process.env in the app, a fixture in
 * tests), so the gating contract is fully testable.
 */
export function analyticsConfigFromEnv(
  env: Record<string, string | undefined>,
): AnalyticsConfig {
  return {
    gaId: cleanId(env.NEXT_PUBLIC_GA_MEASUREMENT_ID, GA_ID_PATTERN),
    clarityId: cleanId(env.NEXT_PUBLIC_CLARITY_PROJECT_ID, CLARITY_ID_PATTERN),
    gscToken: cleanToken(env.NEXT_PUBLIC_GSC_VERIFICATION),
  };
}

/** The live config, read from the process env at call time. */
export function analyticsConfig(): AnalyticsConfig {
  return analyticsConfigFromEnv(process.env);
}

/**
 * Reduce an arbitrary params object to what an event may carry:
 * `{ product }` when product is one of the allowlisted values, and
 * nothing else — every other key (email, vin, problem text, …) is
 * dropped, and an unrecognized product value is dropped with it.
 */
export function sanitizeEventParams(
  input: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const product = input.product;
  if (
    typeof product === "string" &&
    (CHECKOUT_PRODUCTS as readonly string[]).includes(product)
  ) {
    return { product };
  }
  return {};
}

export interface AnalyticsSnippets {
  /** The gtag.js loader URL, or null when GA is off. */
  gaLoaderSrc: string | null;
  /** The inline gtag bootstrap, or null when GA is off. */
  gaConfigScript: string | null;
  /** The inline Clarity loader, or null when Clarity is off. */
  clarityScript: string | null;
}

/**
 * The exact script payloads the root layout renders for a config —
 * kept pure (and unit-tested) so the env gate is pinned by the
 * suite: a config with no ids yields three nulls, i.e. the rendered
 * layout carries NO analytics markup at all; a config with ids
 * yields both vendors' loaders with those ids in them. The ids are
 * format-validated in analyticsConfigFromEnv before they can reach
 * these strings, so interpolation here cannot break out of the
 * script.
 */
export function analyticsSnippets(config: AnalyticsConfig): AnalyticsSnippets {
  return {
    gaLoaderSrc: config.gaId
      ? `https://www.googletagmanager.com/gtag/js?id=${config.gaId}`
      : null,
    gaConfigScript: config.gaId
      ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${config.gaId}');`
      : null,
    clarityScript: config.clarityId
      ? `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${config.clarityId}");`
      : null,
  };
}
