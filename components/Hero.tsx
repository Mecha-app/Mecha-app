"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LoopClip } from "./LoopClip";

/** Scroll cue chevron — drawn line icon (§1.6). */
function ChevronDownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}

/**
 * Homepage hero (route `/`, blueprint §2.1) — design pass "Hero"
 * (2026-11-16, owner: "the hero is still basically text + buttons…
 * have something nicer" — and "put females in the GIFs").
 *
 * The hero is now the product in use, full-viewport, the way
 * Tesla's hero is the car: a muted looping clip of a driver running
 * a diagnosis in the app fills the screen, and the promise — the
 * same headline and the same two actions as before — sits over it.
 * The hero palette is fixed dark in both themes (the footage is
 * dark; the scrim keeps every line readable): white ink, the
 * signal-amber accent at its dark-theme value.
 *
 * The spoken-dialogue film that used to sit framed under the copy
 * keeps its own section directly below (HeroFilm) — click-to-play
 * with sound, unchanged.
 */
export function Hero() {
  const { t } = useLocale();

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

      {/* The promise — centered over the film, exactly the copy and
          actions the hero has always carried. */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-32 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[#f5a524]">
          {t.hero.eyebrow}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.9rem,6.5vw,5.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-white">
          {t.hero.titleLine1}
          <br />
          {t.hero.titleLine2}
        </h1>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/app/scan"
            className="inline-flex h-[52px] items-center rounded-full bg-[#f5a524] px-9 font-display text-base font-semibold text-[#14100a] transition-colors duration-150 hover:bg-[#ffb63e]"
          >
            {t.hero.scanCta}
          </Link>
          <a
            href="#fair-price"
            className="inline-flex h-[52px] items-center rounded-full border border-white/40 px-9 font-display text-base font-medium text-white transition-colors duration-150 hover:border-white"
          >
            {t.hero.filmFairPrice}
          </a>
        </div>

        {/* The standing offer, on the first screen: the three hero
            points from the catalog — the price hook ("First 5
            diagnoses free — no card required") among them. */}
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/85">
          {[t.hero.points.noHardware, t.hero.points.plainLanguage, t.hero.points.freeToStart].map(
            (point, i) => (
              <li key={point} className="flex items-center gap-3">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-white/50" aria-hidden="true" />}
                <span>{point}</span>
              </li>
            ),
          )}
        </ul>
      </div>

      {/* Scroll cue — the page continues below the hero. */}
      <div className="relative z-10 flex justify-center pb-6">
        <a
          href="#how-it-works"
          aria-label={t.howItWorks.eyebrow}
          className="flex h-12 w-12 items-center justify-center text-white/75 transition-colors duration-150 hover:text-white"
        >
          <span className="scroll-cue block">
            <ChevronDownIcon />
          </span>
        </a>
      </div>
    </section>
  );
}
