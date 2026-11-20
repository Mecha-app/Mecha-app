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

/** An iPhone/iPad/iPod UA — or an iPad on iOS 13+ sending a
 *  Macintosh UA, where touch points break the tie. */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/**
 * iOS Safari — the one browser with no beforeinstallprompt, where
 * the hint must teach Share → Add to Home Screen instead.
 * In-app webviews and other iOS browsers (Chrome/Firefox/Edge
 * tokens) are excluded: they cannot add to the home screen from
 * their own menus the same way, and Safari is the door that works.
 */
export function isIosSafari(userAgent: string, maxTouchPoints = 0): boolean {
  const ua = userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;
  if (!isIosDevice(ua, maxTouchPoints)) return false;
  return /Safari/.test(ua);
}

/**
 * An iOS in-app webview (or a non-Safari iOS browser): the page is
 * running inside another app — Facebook (FBAN/FBAV), Instagram,
 * TikTok (musical_ly/ByteDance), the Muse app, a generic
 * WKWebView whose UA carries no Safari token — or in CriOS/FxiOS.
 * NONE of these can add to the home screen, and most don't even
 * offer the Share → Add to Home Screen path; the only door is
 * "Open in Safari". Detection is deliberately the complement of
 * isIosSafari on an iOS device: an iOS UA that is not Safari's is
 * a webview or a third-party browser, and the Safari guidance is
 * the correct instruction for every one of them (owner report
 * 2026-11-20: the hint bar showed inside a webview, where its
 * "Add to Home Screen" line could never work).
 */
export function isIosWebview(userAgent: string, maxTouchPoints = 0): boolean {
  if (!isIosDevice(userAgent, maxTouchPoints)) return false;
  return !isIosSafari(userAgent, maxTouchPoints);
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
