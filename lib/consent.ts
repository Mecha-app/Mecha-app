/**
 * Cookie consent core (cookie-consent pass, 2026-11-19) — the pure,
 * shared half of the consent wiring, side-effect free so the test
 * suite can pin the contract, in the same shape as lib/analytics:
 *
 *  - THE CHOICE IS THE GATE: analytics (GA4 + Clarity) may load only
 *    when the visitor's stored choice is exactly "accepted". No
 *    choice yet, a declined choice, or a garbage stored value all
 *    mean analytics stays OFF — the site itself (diagnosis, checkout,
 *    everything else) never waits on the banner.
 *  - The choice persists in first-party localStorage under one key,
 *    written only by the banner (Accept / Decline) and re-openable
 *    any time from the footer's "Cookie settings" link.
 */

export type ConsentChoice = "accepted" | "declined";

/** localStorage key holding the visitor's choice. */
export const CONSENT_STORAGE_KEY = "mecha-cookie-consent";

/** Window event fired in this tab when the stored choice changes. */
export const CONSENT_CHANGED_EVENT = "mecha:consent-changed";

/** Window event fired when something asks to re-open the banner. */
export const COOKIE_SETTINGS_EVENT = "mecha:cookie-settings";

/**
 * Read a stored value as a choice: only the two exact words count.
 * Anything else (older formats, hand-edited storage, null) is "no
 * choice yet" — the banner shows and analytics stays off.
 */
export function parseConsentChoice(raw: string | null | undefined): ConsentChoice | null {
  return raw === "accepted" || raw === "declined" ? raw : null;
}

/** Analytics may load/fire only on an explicit Accept. */
export function analyticsAllowed(choice: ConsentChoice | null): boolean {
  return choice === "accepted";
}
