"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getToken } from "@/lib/client/auth";
import { RETURN_TO_KEY } from "@/lib/server/scan";
import { LoopClip } from "./LoopClip";

/**
 * Homepage hero (route `/`, blueprint §2.1) — design pass "One
 * Screen" (2026-11-16, owner: "one striking full-screen
 * image/video, a short headline, and clear buttons").
 *
 * The hero loop — a driver running a diagnosis in the app — fills
 * the entire first viewport, and over the legibility scrim sits
 * ONLY the brand line and the two actions. The eyebrow, the
 * three-point offer list, and the scroll cue are gone: the page
 * below is one more full-screen visual, and the picture carries
 * the rest.
 *
 * The primary action is "Run a diagnosis". Signed in, it lands on
 * /app/diagnose directly. Signed out, the diagnosis account gate
 * (2026-11-16) requires an account first: the click saves the
 * return-to (the /app/scan pattern), /app/diagnose bounces the
 * visitor to /login, and sign-in — or registering via the login
 * page's link — lands them back on the diagnosis.
 *
 * The hero palette is fixed dark in both themes (the footage is
 * dark; the scrim keeps every line readable): white ink, the
 * signal-amber accent at its dark-theme value.
 */
export function Hero() {
  const { t } = useLocale();

  const saveReturnTo = () => {
    if (getToken()) return;
    try {
      sessionStorage.setItem(RETURN_TO_KEY, "/app/diagnose");
    } catch {
      // Storage unavailable — the gate's own bounce to /login
      // still applies; the visitor just lands in the app after.
    }
  };

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      {/* The visual — the product in a driver's hands, full-bleed. */}
      <LoopClip name="hero" fill />
      {/* Scrim — darker at the copy and at the foot, clear in the
          middle where the picture carries. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,8,0.66)_0%,rgba(5,6,8,0.28)_38%,rgba(5,6,8,0.22)_62%,rgba(5,6,8,0.62)_100%)]"
      />

      {/* The promise — the brand line and the two actions, nothing
          under the headline. */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-32 text-center sm:px-6">
        <h1 className="mx-auto max-w-4xl font-display text-[clamp(2.9rem,6.5vw,5.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-white">
          {t.hero.titleLine1}
          <br />
          {t.hero.titleLine2}
        </h1>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/app/diagnose"
            onClick={saveReturnTo}
            className="inline-flex h-[52px] items-center rounded-full bg-[#f5a524] px-9 font-display text-base font-semibold text-[#14100a] transition-colors duration-150 hover:bg-[#ffb63e]"
          >
            {t.hero.runCta}
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-[52px] items-center rounded-full border border-white/40 px-9 font-display text-base font-medium text-white transition-colors duration-150 hover:border-white"
          >
            {t.hero.pricingCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
