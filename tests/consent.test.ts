/**
 * Cookie-consent pass (2026-11-19) — the pins for the consent bar
 * and the analytics gate:
 *
 *  - THE CHOICE IS THE GATE: only an exact stored "accepted" lets
 *    analytics load or fire. No choice, a Decline, or a garbage
 *    stored value all keep GA/Clarity off — no scripts requested,
 *    no events sent, no analytics cookies set.
 *  - THE CHOICE PERSISTS: written by the banner to first-party
 *    localStorage under one key, read back verbatim, and change
 *    listeners fire so Accept loads the vendors in place and the
 *    footer's Cookie settings link can re-open the banner.
 *  - THE LOADER IS EXACT AND SINGLE: loadAnalytics injects the
 *    analyticsSnippets payloads once (bootstrap, loader, Clarity),
 *    marks them, and never double-injects.
 *  - WIRING: the banner carries Accept / Decline / the privacy
 *    link as one slim bottom bar, both footers carry the Cookie
 *    settings re-open, and trackEvent re-checks consent itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSENT_STORAGE_KEY,
  analyticsAllowed,
  parseConsentChoice,
} from "../lib/consent";
import {
  disableAnalytics,
  loadAnalytics,
  onConsentChanged,
  openCookieSettings,
  readConsentChoice,
  writeConsentChoice,
} from "../lib/client/consent";
import { analyticsSnippets } from "../lib/analytics";
import { trackEvent } from "../lib/client/analytics";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

/** A window stub with Map-backed localStorage and real listener wiring. */
function stubWindow(stored?: string) {
  const store = new Map<string, string>();
  if (stored !== undefined) store.set(CONSENT_STORAGE_KEY, stored);
  const listeners = new Map<string, Set<(ev: unknown) => void>>();
  const win = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    addEventListener: (type: string, fn: (ev: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: (ev: unknown) => void) => {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent: (ev: { type: string }) => {
      listeners.get(ev.type)?.forEach((fn) => fn(ev));
      return true;
    },
  };
  (globalThis as Record<string, unknown>).window = win;
  return { win, store };
}

function clearWindow() {
  delete (globalThis as Record<string, unknown>).window;
}

test("choice parsing: only the two exact words count", () => {
  assert.equal(parseConsentChoice("accepted"), "accepted");
  assert.equal(parseConsentChoice("declined"), "declined");
  assert.equal(parseConsentChoice("yes"), null);
  assert.equal(parseConsentChoice("ACCEPTED"), null);
  assert.equal(parseConsentChoice(""), null);
  assert.equal(parseConsentChoice(null), null);
  assert.equal(parseConsentChoice(undefined), null);
});

test("the gate: analytics is allowed only on an explicit Accept", () => {
  assert.equal(analyticsAllowed("accepted"), true);
  assert.equal(analyticsAllowed("declined"), false);
  assert.equal(analyticsAllowed(null), false);
});

test("storage: the choice round-trips and change listeners fire", () => {
  stubWindow();
  try {
    assert.equal(readConsentChoice(), null, "no choice stored yet");
    let changes = 0;
    const off = onConsentChanged(() => {
      changes += 1;
    });
    writeConsentChoice("accepted");
    assert.equal(readConsentChoice(), "accepted");
    assert.equal(changes, 1, "the write notified listeners in this tab");
    writeConsentChoice("declined");
    assert.equal(readConsentChoice(), "declined");
    assert.equal(changes, 2);
    off();
    writeConsentChoice("accepted");
    assert.equal(changes, 2, "an unsubscribed listener stays silent");
  } finally {
    clearWindow();
  }
});

test("storage: a garbage stored value reads as no choice", () => {
  stubWindow("everything-free-forever");
  try {
    assert.equal(readConsentChoice(), null);
  } finally {
    clearWindow();
  }
});

/** A document stub capturing appended scripts the way the loader sees them. */
function stubDocument() {
  interface StubScript {
    attrs: Record<string, string>;
    src: string;
    async: boolean;
    textContent: string;
    setAttribute: (k: string, v: string) => void;
  }
  const appended: StubScript[] = [];
  const doc = {
    head: {
      appendChild: (el: StubScript) => {
        appended.push(el);
      },
    },
    createElement: (): StubScript => {
      const el: StubScript = {
        attrs: {},
        src: "",
        async: false,
        textContent: "",
        setAttribute(k, v) {
          el.attrs[k] = v;
        },
      };
      return el;
    },
    querySelector: () =>
      appended.find((el) => el.attrs["data-mecha-analytics"] !== undefined) ?? null,
  };
  return { doc: doc as unknown as Document, appended };
}

const BOTH_IDS = { gaId: "G-ABC123XYZ9", clarityId: "abcd1234ef", gscToken: null };

test("loader: Accept payloads inject once — bootstrap, loader, Clarity", () => {
  const { doc, appended } = stubDocument();
  const snippets = analyticsSnippets(BOTH_IDS);
  assert.equal(loadAnalytics(snippets, doc), true);
  assert.equal(appended.length, 3);
  const [config, loader, clarity] = appended;
  assert.equal(config.attrs["data-mecha-analytics"], "ga-config");
  assert.ok(config.textContent.includes("gtag('config','G-ABC123XYZ9')"));
  assert.equal(loader.attrs["data-mecha-analytics"], "ga-loader");
  assert.ok(loader.src.includes("googletagmanager.com/gtag/js?id=G-ABC123XYZ9"));
  assert.equal(loader.async, true);
  assert.equal(clarity.attrs["data-mecha-analytics"], "clarity");
  assert.ok(clarity.textContent.includes("clarity.ms/tag/"));
  assert.equal(loadAnalytics(snippets, doc), false, "a second call injects nothing");
  assert.equal(appended.length, 3);
});

test("loader: GA-only config injects two scripts; no ids inject none", () => {
  const gaOnly = stubDocument();
  assert.equal(
    loadAnalytics(analyticsSnippets({ gaId: "G-ABC123XYZ9", clarityId: null, gscToken: null }), gaOnly.doc),
    true,
  );
  assert.equal(gaOnly.appended.length, 2);
  const none = stubDocument();
  assert.equal(
    loadAnalytics(analyticsSnippets({ gaId: null, clarityId: null, gscToken: null }), none.doc),
    false,
  );
  assert.equal(none.appended.length, 0);
});

test("disable: a switch to Decline trips GA's ga-disable flag", () => {
  const { win } = stubWindow();
  try {
    disableAnalytics("G-ABC123XYZ9");
    assert.equal((win as Record<string, unknown>)["ga-disable-G-ABC123XYZ9"], true);
    disableAnalytics(null);
  } finally {
    clearWindow();
  }
});

test("events: trackEvent fires only on a stored Accept", () => {
  const calls: string[] = [];
  const gtag = (_command: string, name: string) => {
    calls.push(name);
  };

  stubWindow(); // no choice yet
  try {
    Object.assign((globalThis as Record<string, unknown>).window as object, { gtag });
    trackEvent("diagnosis_started");
    assert.deepEqual(calls, [], "no choice → no event, even with gtag present");
  } finally {
    clearWindow();
  }

  stubWindow("declined");
  try {
    Object.assign((globalThis as Record<string, unknown>).window as object, { gtag });
    trackEvent("diagnosis_started");
    assert.deepEqual(calls, [], "declined → no event");
  } finally {
    clearWindow();
  }

  stubWindow("accepted");
  try {
    Object.assign((globalThis as Record<string, unknown>).window as object, { gtag });
    trackEvent("diagnosis_started");
    assert.deepEqual(calls, ["diagnosis_started"], "accepted → the event fires");
  } finally {
    clearWindow();
  }
});

test("wiring: slim bottom bar with Accept, Decline, and the privacy link", () => {
  const banner = read("components/CookieConsent.tsx");
  assert.ok(banner.includes("fixed inset-x-0 bottom-0"), "the bar is fixed to the bottom");
  assert.ok(banner.includes('href="/privacy"'), "the privacy policy is linked");
  assert.ok(banner.includes('choose("accepted")'), "Accept stores the Accept");
  assert.ok(banner.includes('choose("declined")'), "Decline stores the Decline");
  assert.ok(banner.includes("readConsentChoice() === null"), "the bar shows only with no stored choice");
  assert.ok(banner.includes("onCookieSettingsOpen"), "the bar re-opens from Cookie settings");
  assert.ok(!banner.includes("trackEvent"), "the banner itself never fires analytics");
});

test("wiring: both footers carry the Cookie settings re-open", () => {
  for (const rel of ["components/Footer.tsx", "components/HomeFooter.tsx"]) {
    const footer = read(rel);
    assert.ok(footer.includes("openCookieSettings()"), `${rel} re-opens the banner`);
    assert.ok(footer.includes("t.consent.settings"), `${rel} labels it from the dictionary`);
  }
  assert.doesNotThrow(() => openCookieSettings(), "no window is a silent no-op");
});

test("wiring: the gate and the event door both check consent", () => {
  const gate = read("components/AnalyticsGate.tsx");
  assert.ok(gate.includes('choice === "accepted"'), "the gate loads only on Accept");
  assert.ok(gate.includes("loadAnalytics(snippets)"), "the gate loads through the loader");
  const door = read("lib/client/analytics.ts");
  assert.ok(door.includes('readConsentChoice() !== "accepted"'), "trackEvent re-checks the choice");
  const privacy = read("app/privacy/page.tsx");
  assert.ok(privacy.includes("stay off until you say yes"), "the privacy page discloses the gate");
});
