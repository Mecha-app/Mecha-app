"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LoopClip } from "./LoopClip";

/**
 * The homepage's one breath below the fold — design pass "One
 * Screen" (2026-11-16, owner: one full-screen visual, a short
 * headline, clear buttons — and restraint below).
 *
 * A second full-screen visual in the hero's own language: the
 * recall-alert loop (a driver reading the alert beside her car)
 * fills the viewport, and over it sit one short line and one
 * button — the shops door. The full business story lives on
 * /shops; this section only points at it. Same fixed dark palette
 * as the hero, since the footage is dark in both themes.
 */
export function HomeShops() {
  const { t } = useLocale();

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <LoopClip name="alert" fill />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,8,0.55)_0%,rgba(5,6,8,0.25)_45%,rgba(5,6,8,0.55)_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
          {t.hero.shopsLine}
        </h2>
        <Link
          href="/shops"
          className="mt-10 inline-flex h-[52px] items-center rounded-full bg-[#f5a524] px-9 font-display text-base font-semibold text-[#14100a] transition-colors duration-150 hover:bg-[#ffb63e]"
        >
          {t.header.navShops}
        </Link>
      </div>
    </section>
  );
}
