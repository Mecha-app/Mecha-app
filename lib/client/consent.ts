"use client";

/**
 * The client half of the cookie-consent wiring (cookie-consent pass,
 * 2026-11-19): storage, change events, and the analytics loader.
 *
 * HOW THE GATE WORKS: the root layout no longer renders the GA4 /
 * Clarity scripts directly. AnalyticsGate (components) asks this
 * module to load them, and loadAnalytics runs ONLY when the stored
 * choice is an explicit Accept (the gate checks before calling, and
 * trackEvent re-checks before firing). Before any choice — and
 * forever on Decline — no vendor script is requested, so no
 * analytics cookies are set. Accepting in the banner loads the
 * vendors in place, no page reload needed. Switching back to
 * Decline stops further events immediately and sets GA's official
 * ga-disable flag; a vendor already loaded in that tab stops
 * collecting on the next page load, when the gate simply never
 * loads it.
 *
 * Everything here is best-effort by design: storage can be blocked
 * or full, and any failure is swallowed — consent plumbing must
 * never break the product it measures.
 */

import {
  CONSENT_CHANGED_EVENT,
  CONSENT_STORAGE_KEY,
  COOKIE_SETTINGS_EVENT,
  parseConsentChoice,
  type ConsentChoice,
} from "../consent";
import type { AnalyticsSnippets } from "../analytics";

/** The visitor's stored choice, or null when they have not chosen. */
export function readConsentChoice(): ConsentChoice | null {
  try {
    if (typeof window === "undefined") return null;
    return parseConsentChoice(window.localStorage?.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persist a choice and notify this tab's listeners. */
export function writeConsentChoice(choice: ConsentChoice): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage?.setItem(CONSENT_STORAGE_KEY, choice);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
  } catch {
    // A blocked store leaves the banner's in-memory state in charge.
  }
}

/** Ask the banner to re-open (the footer's "Cookie settings" link). */
export function openCookieSettings(): void {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
  } catch {
    // No banner mounted (should not happen) — nothing to open.
  }
}

/** Run `handler` whenever the stored choice may have changed. */
export function onConsentChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Run `handler` when the footer asks to re-open the banner. */
export function onCookieSettingsOpen(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COOKIE_SETTINGS_EVENT, handler);
  return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, handler);
}

/**
 * Inject the vendor scripts (built by the pure analyticsSnippets)
 * into the document head. Idempotent: the injected tags carry a
 * data-mecha-analytics marker and a second call finds them and does
 * nothing. Returns true when this call did the injecting. The `doc`
 * parameter exists so the test suite can drive the loader against a
 * stub document; production callers use the real one.
 */
export function loadAnalytics(
  snippets: AnalyticsSnippets,
  doc: Document = document,
): boolean {
  try {
    if (!snippets.gaLoaderSrc && !snippets.gaConfigScript && !snippets.clarityScript) {
      return false;
    }
    if (doc.querySelector("script[data-mecha-analytics]")) return false;
    const add = (mark: string, src: string | null, inline: string | null) => {
      if (!src && !inline) return;
      const el = doc.createElement("script");
      el.setAttribute("data-mecha-analytics", mark);
      if (src) {
        el.src = src;
        el.async = true;
      }
      if (inline) el.textContent = inline;
      doc.head.appendChild(el);
    };
    // Bootstrap first (defines gtag + the dataLayer queue), then the
    // loader that drains it, then Clarity — the same order the old
    // server-rendered head produced.
    add("ga-config", null, snippets.gaConfigScript);
    add("ga-loader", snippets.gaLoaderSrc, null);
    add("clarity", null, snippets.clarityScript);
    return true;
  } catch {
    return false;
  }
}

/**
 * The most a page can do after a same-session switch to Decline:
 * GA's documented kill switch stops further hits and cookie writes
 * from the already-loaded gtag. (Clarity has no equivalent switch;
 * it simply never loads again on the next page view.)
 */
export function disableAnalytics(gaId: string | null): void {
  try {
    if (!gaId || typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true;
  } catch {
    // Best-effort, like everything in this module.
  }
}
