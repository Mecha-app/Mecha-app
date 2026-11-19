/**
 * Analytics pass (2026-11-18) — the pins for the GA4 + Clarity +
 * Search Console wiring:
 *
 *  - ENV GATE: no ids in the env → the config is all-null and the
 *    snippet builder yields nothing, so the rendered layout carries
 *    no analytics markup at all; well-formed ids → both vendors'
 *    loaders carry them. Malformed values are rejected, never
 *    rendered.
 *  - PAYLOAD HYGIENE: an event may carry only `product`, from the
 *    closed allowlist. Emails, VINs, problem text — dropped by the
 *    sanitizer, and trackEvent sends nothing else even when a call
 *    site hands it a dirty object.
 *  - WIRING: the funnel events sit at their real code points (the
 *    diagnosis submit/done, the paywall render, both checkout
 *    initiations, both Stripe success returns, the photo scan), the
 *    layout mounts the scripts + the verification meta, and the
 *    privacy page discloses both tools.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FUNNEL_EVENTS,
  analyticsConfigFromEnv,
  analyticsSnippets,
  sanitizeEventParams,
} from "../lib/analytics";
import { trackEvent } from "../lib/client/analytics";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("env gate: no ids configured → no config, no snippets, nothing renders", () => {
  const config = analyticsConfigFromEnv({});
  assert.deepEqual(config, { gaId: null, clarityId: null, gscToken: null });
  const snippets = analyticsSnippets(config);
  assert.deepEqual(snippets, { gaLoaderSrc: null, gaConfigScript: null, clarityScript: null });
});

test("env gate: well-formed ids → both loaders carry them", () => {
  const config = analyticsConfigFromEnv({
    NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABC123XYZ9",
    NEXT_PUBLIC_CLARITY_PROJECT_ID: "abcd1234ef",
    NEXT_PUBLIC_GSC_VERIFICATION: "token_value-123",
  });
  assert.equal(config.gaId, "G-ABC123XYZ9");
  assert.equal(config.clarityId, "abcd1234ef");
  assert.equal(config.gscToken, "token_value-123");
  const snippets = analyticsSnippets(config);
  assert.ok(snippets.gaLoaderSrc?.includes("googletagmanager.com/gtag/js?id=G-ABC123XYZ9"));
  assert.ok(snippets.gaConfigScript?.includes("gtag('config','G-ABC123XYZ9')"));
  assert.ok(snippets.clarityScript?.includes("clarity.ms/tag/"));
  assert.ok(snippets.clarityScript?.includes('"abcd1234ef"'));
});

test("env gate: malformed values are rejected, never rendered", () => {
  const config = analyticsConfigFromEnv({
    NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-12345",
    NEXT_PUBLIC_CLARITY_PROJECT_ID: "has spaces in it",
    NEXT_PUBLIC_GSC_VERIFICATION: 'bad"token',
  });
  assert.deepEqual(config, { gaId: null, clarityId: null, gscToken: null });
  const snippets = analyticsSnippets(config);
  assert.deepEqual(snippets, { gaLoaderSrc: null, gaConfigScript: null, clarityScript: null });
});

test("payload hygiene: only an allowlisted product survives sanitizing", () => {
  assert.deepEqual(
    sanitizeEventParams({
      product: "pro",
      email: "driver@example.com",
      vin: "1FTFW1ET5DFC10312",
      problem: "grinding noise when I brake",
      vehicleInfo: "2013 Ford F-150",
    }),
    { product: "pro" },
  );
  assert.deepEqual(sanitizeEventParams({ product: "everything-free-forever" }), {});
  assert.deepEqual(sanitizeEventParams({ email: "driver@example.com" }), {});
  assert.deepEqual(sanitizeEventParams(undefined), {});
  assert.deepEqual(sanitizeEventParams({}), {});
});

test("trackEvent: sends the sanitized payload to gtag, and only that", () => {
  const calls: Array<{ command: string; name: string; params: Record<string, string> }> = [];
  (globalThis as Record<string, unknown>).window = {
    // Consent pass (2026-11-19): events fire only on a stored Accept,
    // so the stub carries one — the no-consent cases live in
    // tests/consent.test.ts.
    localStorage: { getItem: () => "accepted" },
    gtag: (command: string, name: string, params: Record<string, string>) => {
      calls.push({ command, name, params });
    },
  };
  try {
    trackEvent("checkout_started", {
      product: "single_credit",
      email: "driver@example.com",
      vin: "1FTFW1ET5DFC10312",
    });
    trackEvent("diagnosis_started");
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
  assert.deepEqual(calls, [
    { command: "event", name: "checkout_started", params: { product: "single_credit" } },
    { command: "event", name: "diagnosis_started", params: {} },
  ]);
});

test("trackEvent: no window or no gtag is a silent no-op", () => {
  assert.doesNotThrow(() => trackEvent("paywall_viewed"));
  (globalThis as Record<string, unknown>).window = {};
  try {
    assert.doesNotThrow(() => trackEvent("paywall_viewed"));
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});

test("the funnel vocabulary is exactly the six agreed events", () => {
  assert.deepEqual([...FUNNEL_EVENTS], [
    "diagnosis_started",
    "diagnosis_completed",
    "photo_scan_completed",
    "paywall_viewed",
    "checkout_started",
    "purchase_completed",
  ]);
});

test("layout: consent gate + banner mounted, verification meta env-gated", () => {
  const layout = read("app/layout.tsx");
  assert.ok(layout.includes("<AnalyticsScripts />"), "the layout mounts the analytics gate");
  assert.ok(layout.includes("<CookieConsent />"), "the layout mounts the consent banner");
  assert.ok(layout.includes("verification: gscToken"), "the GSC meta is gated on the token");
  const component = read("components/AnalyticsScripts.tsx");
  assert.ok(component.includes("analyticsConfig()"), "the mount reads the env config");
  assert.ok(component.includes("<AnalyticsGate"), "the mount hands the ids to the consent gate");
  assert.ok(
    !component.includes("dangerouslySetInnerHTML"),
    "vendor scripts are no longer server-rendered — the client gate loads them after Accept",
  );
  const gate = read("components/AnalyticsGate.tsx");
  assert.ok(gate.includes("analyticsSnippets("), "the gate builds the vendor payloads");
  assert.ok(gate.includes("readConsentChoice()"), "the gate reads the stored choice");
});

test("funnel wiring: every event sits at its real code point", () => {
  const diagnose = read("app/app/diagnose/page.tsx");
  assert.ok(diagnose.includes('trackEvent("diagnosis_started")'), "diagnosis submit");
  assert.ok(diagnose.includes('trackEvent("diagnosis_completed")'), "stream done event");
  assert.ok(diagnose.includes('trackEvent("paywall_viewed")'), "paywall render");
  assert.ok(diagnose.includes('trackEvent("checkout_started"'), "paywall checkout door");
  assert.ok(
    diagnose.includes('<CheckoutReturnTracker product="single_credit" />'),
    "the credit success return lands on the diagnose page",
  );
  const scan = read("app/app/scan/page.tsx");
  assert.ok(scan.includes('trackEvent("photo_scan_completed")'), "photo scan success");
  const billing = read("components/BillingSection.tsx");
  assert.ok(billing.includes('trackEvent("checkout_started"'), "dashboard checkout");
  const dashboard = read("app/app/page.tsx");
  assert.ok(
    dashboard.includes('<CheckoutReturnTracker product="subscription" />'),
    "the subscription success return lands on the dashboard",
  );
  const tracker = read("components/CheckoutReturnTracker.tsx");
  assert.ok(tracker.includes('trackEvent("purchase_completed"'), "the return fires the purchase");
  assert.ok(tracker.includes('searchParams.get("checkout") !== "success"'), "no param, no event");
});

test("privacy page discloses both tools and the opt-out", () => {
  const privacy = read("app/privacy/page.tsx");
  assert.ok(privacy.includes("Google Analytics"));
  assert.ok(privacy.includes("Microsoft Clarity"));
  assert.ok(privacy.includes("tools.google.com/dlpage/gaoptout"), "Google's opt-out is linked");
  assert.ok(privacy.includes("vehicle identification number"), "the never-sent list is stated");
});
