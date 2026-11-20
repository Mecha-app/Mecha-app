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
 * HOW IT INSTALLS:
 *   - Chromium/Android: the real beforeinstallprompt event is
 *     stashed and fired from the Install button — one tap, the
 *     browser's own sheet.
 *   - iOS Safari has no such event: the bar teaches the one path
 *     that exists — Share, then "Add to Home Screen" — in a single
 *     line with the share glyph. Shown only on iOS Safari.
 */
export function PwaInstall() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"prompt" | "ios">("ios");
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const iosRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The gate check, shared by every trigger (mount, the browser's
  // install event, a consent choice, a navigation). Reads live
  // storage each time; arms the one delayed reveal at most once.
  const evaluateRef = useRef(() => {});
  evaluateRef.current = () => {
    if (isInstallDone() || isInstallDismissed(Date.now())) return;
    if (readConsentChoice() === null) return;
    if (readInstallViews() < 2) return;
    if (!iosRef.current && deferredRef.current === null) return;
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

    iosRef.current = isIosSafari(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints ?? 0,
    );
    if (iosRef.current) setMode("ios");

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

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      role="region"
      aria-label={t.install.label}
    >
      {/* bg-surface OPAQUE, deliberately not the 95% alpha
          variant: the design tokens are plain CSS vars, so
          Tailwind cannot generate alpha variants of them — that
          class silently does not exist and the bar would render
          transparent over the hero photo (found by screenshot,
          2026-11-20). */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_8px_30px_rgba(15,42,80,0.14)]">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-[10px]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-ink-1">{t.install.title}</p>
          {mode === "ios" ? (
            <p className="flex items-center gap-1.5 text-sm leading-snug text-ink-2">
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
                <path d="M12 15V4" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6" />
              </svg>
              <span>{t.install.iosHint}</span>
            </p>
          ) : (
            <p className="text-sm leading-snug text-ink-2">{t.install.body}</p>
          )}
        </div>
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
    </div>
  );
}
