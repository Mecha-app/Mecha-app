"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LoopClip } from "./LoopClip";

/**
 * The homepage's shops breath — design pass "One Screen"
 * (2026-11-16) kept the shape, design pass #5 (same day) restyles
 * it to the owner's bright reference: the recall-alert loop (a
 * driver reading the alert beside her car) still fills a full
 * screen between the white steps section and the blue closing
 * band, but the scrim lightens and the one button is now the
 * page's blue primary instead of the amber pill. One short line,
 * one button — the full business story still lives on /shops.
 * On-image colors stay self-contained literals (globals.css rule).
 */
export function HomeShops() {
  const { t } = useLocale();

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <LoopClip name="alert" fill />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,8,0.42)_0%,rgba(5,6,8,0.16)_45%,rgba(5,6,8,0.42)_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
          {t.hero.shopsLine}
        </h2>
        <Link
          href="/shops"
          className="mt-10 inline-flex h-[52px] items-center rounded-lg bg-[#2563eb] px-9 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
        >
          {t.header.navShops}
        </Link>
      </div>
    </section>
  );
}
