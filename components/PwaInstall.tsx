"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readConsentChoice } from "@/lib/client/consent";
import { isNativeShell } from "@/lib/client/nativeShell";
import {
  bumpInstallViews,
  isCoarsePointer,
  isInstallDismissed,
  isInstallDone,
  isIosSafari,
  isIosWebview,
  isStandaloneDisplay,
  readInstallViews,
  writeInstallDismissed,
  writeInstallDone,
  type BeforeInstallPromptEvent,
} from "@/lib/client/pwa";
import { CONSENT_CHANGED_EVENT } from "@/lib/consent";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Home-screen install hint (PWA install pass, 2026-11-20, owner
 * order: "people add it as an app on the phone… they click home
 * screen"). A slim bottom bar in the CookieConsent treatment —
 * never a modal, never on first paint.
 *
 * WHO SEES IT (every gate must pass):
 *   - a phone-class browser (coarse pointer) — desktops never;
 *   - NOT already running as the installed app, and never after
 *     the appinstalled event has been seen;
 *   - NOT inside the Capacitor shell (it IS the app there);
 *   - the visitor has engaged: at least a second recorded page
 *     view (full loads and in-app navigations both count);
 *   - the cookie bar is settled (a stored consent choice), so the
 *     two bars never stack on the same strip;
 *   - no dismissal inside its 30-day cooldown.
 * It appears ~1.5s after the last gate passes — engagement first,
 * chrome second.
 *
 * HOW IT INSTALLS — three variants, one per surface:
 *   - Chromium/Android ("prompt"): the real beforeinstallprompt
 *     event is stashed and fired from the Install button — one
 *     tap, the browser's own sheet. The ONLY variant with a
 *     button, because it is the only one where a tap can act.
 *   - iOS Safari ("ios"): Safari has NO install event and no
 *     programmatic path — nothing the page renders can install.
 *     The bar is therefore a pure visual GUIDE, never a control:
 *     two steps drawn the way the phone itself draws them (the
 *     Share glyph in a tile, an arrow, then a row styled like the
 *     iOS menu item "Add to Home Screen"). Tapping the steps
 *     replays a highlight that walks step 1 → step 2, so a tap
 *     visibly DOES something — teach, never pretend.
 *   - iOS in-app webview ("webview"): inside Facebook, Instagram,
 *     TikTok, the Muse app, or any WKWebView, Add to Home Screen
 *     does not exist at all. The guide's second step becomes the
 *     one door that works: "Open in Safari".
 *
 * OWNER REPORT that forced this shape (2026-11-20 ~15:47 ET):
 * "The Add to Home Screen button doesn't work when clicking it —
 * it does not move or change anything." The shipped iOS variant
 * rendered no button at all — but its title + one-line hint read
 * exactly like one ("Add MECHA to your home screen… then 'Add to
 * Home Screen'"), so the owner tapped the words and the words sat
 * still. Dead-looking text is a dead button to the person tapping
 * it; the guide below cannot be mistaken for one.
 */
type InstallMode = "prompt" | "ios" | "webview";

export function PwaInstall() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<InstallMode>("ios");
  const [pulseStep, setPulseStep] = useState(0);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const iosRef = useRef(false);
  const webviewRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // The guided highlight: light step 1, then step 2, then rest —
  // the eye is walked through the phone's own menu path. Runs
  // once when a guide variant reveals, and again on every tap of
  // the steps (a tap must visibly do something — see the header).
  const runGuideRef = useRef(() => {});
  runGuideRef.current = () => {
    for (const timer of pulseTimersRef.current) clearTimeout(timer);
    pulseTimersRef.current = [
      setTimeout(() => setPulseStep(1), 400),
      setTimeout(() => setPulseStep(2), 1300),
      setTimeout(() => setPulseStep(0), 2200),
    ];
  };

  // The gate check, shared by every trigger (mount, the browser's
  // install event, a consent choice, a navigation). Reads live
  // storage each time; arms the one delayed reveal at most once.
  const evaluateRef = useRef(() => {});
  evaluateRef.current = () => {
    if (isInstallDone() || isInstallDismissed(Date.now())) return;
    if (readConsentChoice() === null) return;
    if (readInstallViews() < 2) return;
    if (!iosRef.current && !webviewRef.current && deferredRef.current === null) return;
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => setVisible(true), 1500);
  };

  useEffect(() => {
    if (isNativeShell()) return;
    if (typeof window === "undefined") return;

    const standalone = isStandaloneDisplay(
      window.matchMedia("(display-mode: standalone)").matches,
      (window.navigator as Navigator & { standalone?: boolean }).standalone,
    );
    if (standalone || isInstallDone()) return;
    if (!isCoarsePointer(window.matchMedia("(pointer: coarse)").matches)) return;

    const ua = window.navigator.userAgent;
    const touchPoints = window.navigator.maxTouchPoints ?? 0;
    iosRef.current = isIosSafari(ua, touchPoints);
    webviewRef.current = !iosRef.current && isIosWebview(ua, touchPoints);
    if (iosRef.current) setMode("ios");
    if (webviewRef.current) setMode("webview");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as BeforeInstallPromptEvent;
      setMode("prompt");
      evaluateRef.current();
    };
    const onInstalled = () => {
      writeInstallDone(Date.now());
      setVisible(false);
    };
    const onConsent = () => evaluateRef.current();

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);
    evaluateRef.current();
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      for (const timer of pulseTimersRef.current) clearTimeout(timer);
      pulseTimersRef.current = [];
    };
  }, []);

  // Count in-app navigations as views too (the root layout stays
  // mounted across soft navigations, so the mount alone would only
  // ever count full loads).
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    bumpInstallViews();
    evaluateRef.current();
  }, [pathname]);

  // A guide variant teaches on arrival: one guided highlight pass
  // the moment it reveals, before any tap happens.
  useEffect(() => {
    if (!visible || mode === "prompt") return;
    runGuideRef.current();
  }, [visible, mode]);

  if (!visible) return null;

  const dismiss = () => {
    writeInstallDismissed(Date.now());
    setVisible(false);
  };

  const install = async () => {
    const deferred = deferredRef.current;
    if (!deferred) return;
    deferredRef.current = null;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        writeInstallDone(Date.now());
      } else {
        writeInstallDismissed(Date.now());
      }
    } catch {
      writeInstallDismissed(Date.now());
    }
    setVisible(false);
  };

  const tileClass = (active: boolean) =>
    `flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border transition-all duration-300 ${
      active
        ? "border-accent bg-surface text-accent-deep ring-2 ring-accent"
        : "border-line bg-inset text-ink-2"
    }`;
  const stepLabelClass = (active: boolean) =>
    `shrink-0 text-xs transition-all duration-300 ${
      active ? "font-semibold text-accent-deep" : "font-medium text-ink-2"
    }`;
  const menuRowClass = (active: boolean) =>
    `flex min-w-0 items-center gap-1.5 rounded-[9px] border px-2 py-1.5 transition-all duration-300 ${
      active
        ? "border-accent bg-surface ring-2 ring-accent"
        : "border-line bg-inset"
    }`;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      role="region"
      aria-label={t.install.label}
      data-install-variant={mode}
    >
      {/* bg-surface OPAQUE, deliberately not the 95% alpha
          variant: the design tokens are plain CSS vars, so
          Tailwind cannot generate alpha variants of them — that
          class silently does not exist and the bar would render
          transparent over the hero photo (found by screenshot,
          2026-11-20). */}
      <div className="mx-auto max-w-6xl rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_8px_30px_rgba(15,42,80,0.14)]">
        <div className="flex items-center gap-3">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-[10px]"
          />
          {mode === "prompt" ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-ink-1">{t.install.title}</p>
              <p className="text-sm leading-snug text-ink-2">{t.install.body}</p>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-ink-1">
                {mode === "webview" ? t.install.webviewHint : t.install.title}
              </p>
            </div>
          )}
          {mode === "prompt" ? (
            <button
              type="button"
              onClick={install}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-bright"
            >
              {t.install.button}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            aria-label={t.install.dismiss}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-inset hover:text-ink-1"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {mode === "prompt" ? null : (
          <>
            {/* THE GUIDE — a picture of the phone's own steps,
                never a control: no filled pill, no button element,
                no hover state. It gets the bar's full width (its
                own row under the header) so the menu item's name
                renders whole — those are the exact words the
                visitor must find in the phone's menu. Tapping it
                replays the highlight walk (step 1 → step 2), so a
                tap visibly responds by teaching, the only honest
                response iOS allows. */}
            <div
              data-install-steps
              onClick={() => runGuideRef.current()}
              className="mt-2 flex cursor-pointer items-center gap-2"
            >
              <span className={tileClass(pulseStep === 1)}>
                {mode === "webview" ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <circle cx="5" cy="12" r="1.7" />
                    <circle cx="12" cy="12" r="1.7" />
                    <circle cx="19" cy="12" r="1.7" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 15V4" />
                    <path d="m7 8 5-5 5 5" />
                    <path d="M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6" />
                  </svg>
                )}
              </span>
              <span className={stepLabelClass(pulseStep === 1)}>{t.install.stepShare}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-ink-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12h15" />
                <path d="m13 6 6 6-6 6" />
              </svg>
              <span className={menuRowClass(pulseStep === 2)}>
                {mode === "webview" ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-accent-deep"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="m15.5 8.5-2 5-5 2 2-5z" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0 text-accent-deep"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="3.5" />
                    <path d="M12 8.5v7M8.5 12h7" />
                  </svg>
                )}
                <span className="truncate text-xs font-medium text-ink-1">
                  {mode === "webview" ? t.install.stepOpenSafari : t.install.stepAdd}
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
