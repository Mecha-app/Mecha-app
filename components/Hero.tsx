"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getToken } from "@/lib/client/auth";
import { RETURN_TO_KEY } from "@/lib/server/scan";

/**
 * Homepage hero (route `/`) — design pass #5 (2026-11-16, owner
 * reference #1: "at least the beginning — I like some of this").
 *
 * One striking full-screen PHOTO — a dark SUV on a winding mountain
 * road at golden-hour sunrise (public/images/hero-road.jpg,
 * generated for this pass) — fills the first screen under the white
 * header. Centered over it, exactly like the reference: the small
 * eyebrow tagline "Drive with confidence." (a literal, owner-set in
 * pass #13, 2026-11-16 — it replaced the old domain eyebrow, which
 * repeated the address the visitor is already on), the headline
 * "Your AI mechanic copilot.",
 * ONE subline — our own brand promise, "Know what's wrong. Know
 * what it should cost." (the reference's "Know what to do next"
 * is NOT copied) — and exactly two buttons: the blue solid "Start
 * a free diagnosis" and the white/outline "See how it works"
 * → /diagnose.
 *
 * The primary keeps pass #4's behavior: signed in it lands on
 * /app/diagnose directly; signed out, the click saves the
 * return-to (the /app/scan pattern) so the diagnosis account gate's
 * bounce to /login lands back on the diagnosis after sign-in.
 *
 * The copy sits in the photo's upper half over a soft top scrim —
 * self-contained literal colors on the elements themselves, per
 * the on-image rule in globals.css (never token overrides).
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
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-black">
      {/* The visual — the road at sunrise, full-bleed. */}
      <img
        src="/images/hero-road.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Scrim — soft at the top where the copy sits, clear through
          the middle where the picture carries, a touch at the foot. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,8,0.52)_0%,rgba(5,6,8,0.20)_42%,rgba(5,6,8,0.08)_68%,rgba(5,6,8,0.34)_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pt-[9vh] text-center sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.34em] text-white/85">
          Drive with confidence.
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl font-display text-[clamp(2.6rem,6vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
          {t.hero.copilotTitle}
        </h1>
        <p className="mt-5 text-lg text-white/90 sm:text-xl">
          {t.hero.titleLine1} {t.hero.titleLine2}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/app/diagnose"
            onClick={saveReturnTo}
            className="inline-flex h-[52px] items-center rounded-lg bg-[#2563eb] px-8 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
          >
            {t.hero.startFreeCta}
          </Link>
          <Link
            href="/diagnose"
            className="inline-flex h-[52px] items-center rounded-lg border border-white/70 px-8 font-display text-base font-medium text-white transition-colors duration-150 hover:bg-white/10"
          >
            {t.hero.howCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
