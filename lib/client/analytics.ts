"use client";

/**
 * The client half of the analytics wiring (analytics pass,
 * 2026-11-18): one tiny typed door for funnel events. Call sites pass
 * an event name from the closed FUNNEL_EVENTS list and, for the two
 * commerce events, a product from the closed allowlist — the payload
 * is run through sanitizeEventParams (lib/analytics) before it leaves,
 * so no call site can attach personal data, a VIN, or diagnosis text
 * to an event even by mistake.
 *
 * Firing is best-effort by design: when the GA script is absent (the
 * env vars unset) or gtag has not loaded, the call is a silent no-op,
 * and any error is swallowed — analytics must never break the
 * product it measures.
 */

import {
  sanitizeEventParams,
  type FunnelEventName,
} from "../analytics";

type GtagFn = (command: string, eventName: string, params: Record<string, string>) => void;

export function trackEvent(
  name: FunnelEventName,
  params?: Record<string, unknown>,
): void {
  try {
    if (typeof window === "undefined") return;
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (typeof gtag !== "function") return;
    gtag("event", name, sanitizeEventParams(params));
  } catch {
    // Measurement is optional; the diagnosis is not.
  }
}
