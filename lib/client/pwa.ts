"use client";

/**
 * PWA install helpers (PWA install pass, 2026-11-20): the storage
 * and detection halves of the home-screen hint (components/
 * PwaInstall). Everything here is best-effort — storage can be
 * blocked or full, and any failure is swallowed: install plumbing
 * must never break the product it decorates.
 *
 * The pure detectors take plain values (user agent, touch points,
 * a matchMedia result) so the test suite can pin them without a
 * browser; the component gathers the live values and calls them.
 */

/** The visitor tapped "Not now" — don't ask again for a while. */
export const INSTALL_DISMISSED_KEY = "mecha-install-dismissed";
/** The visitor installed (appinstalled) — never ask again. */
export const INSTALL_DONE_KEY = "mecha-installed";
/** Distinct page views this browser has had (the "second view" gate). */
export const INSTALL_VIEWS_KEY = "mecha-install-views";
/** How long a dismissal silences the hint: 30 days. */
export const INSTALL_DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** The Chromium install event, stashed so the button can fire it. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when the site is already running as the installed app. */
export function isStandaloneDisplay(
  standaloneMedia: boolean,
  navigatorStandalone?: boolean,
): boolean {
  return standaloneMedia || navigatorStandalone === true;
}

/**
 * iOS Safari — the one browser with no beforeinstallprompt, where
 * the hint must teach Share → Add to Home Screen instead. iPads on
 * iOS 13+ send a Macintosh UA, so touch points break the tie.
 * In-app webviews and other iOS browsers (Chrome/Firefox/Edge
 * tokens) are excluded: they cannot add to the home screen from
 * their own menus the same way, and Safari is the door that works.
 */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ua = userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  const iDevice = /iPhone|iPad|iPod/.test(ua);
  const iPadDesktopUa = /Macintosh/.test(ua) && maxTouchPoints > 1;
  if (!iDevice && !iPadDesktopUa) return false;
  return /Safari/.test(ua);
}

/** Phones and small tablets get the hint; desktops never do. */
export function isCoarsePointer(coarse: boolean): boolean {
  return coarse === true;
}

function readNumber(key: string): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage?.getItem(key);
    if (raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage?.setItem(key, String(value));
  } catch {
    /* best-effort */
  }
}

/** Record one more page view; returns the running total. */
export function bumpInstallViews(): number {
  const next = (readNumber(INSTALL_VIEWS_KEY) ?? 0) + 1;
  writeNumber(INSTALL_VIEWS_KEY, next);
  return next;
}

export function readInstallViews(): number {
  return readNumber(INSTALL_VIEWS_KEY) ?? 0;
}

/** True while a dismissal is still inside its cooldown. */
export function isInstallDismissed(now: number): boolean {
  const at = readNumber(INSTALL_DISMISSED_KEY);
  return at !== null && now - at < INSTALL_DISMISS_COOLDOWN_MS;
}

export function writeInstallDismissed(now: number): void {
  writeNumber(INSTALL_DISMISSED_KEY, now);
}

export function isInstallDone(): boolean {
  return readNumber(INSTALL_DONE_KEY) !== null;
}

export function writeInstallDone(now: number): void {
  writeNumber(INSTALL_DONE_KEY, now);
}
