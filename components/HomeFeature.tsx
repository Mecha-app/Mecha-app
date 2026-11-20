"use client";

import Link from "next/link";
import { getToken } from "@/lib/client/auth";
import { RETURN_TO_KEY } from "@/lib/server/scan";
import { LoopClip } from "./LoopClip";

type LoopName = "diagnose" | "quote" | "mechanic" | "roadside" | "hero" | "alert";

/**
 * The Audi-pattern homepage section — design pass #6 (2026-11-16,
 * owner: the pass #5 page "looks way better" but is "too short —
 * you can't even scroll… I want more info"; his direction: model
 * on Audi USA, full-width visual sections stacked all the way
 * down). One striking full-width visual, ONE headline, ONE short
 * line, ONE blue button — visual-first, no text walls, no card
 * grids. The shape is HomeShops' (pass #4/#5) with the line added:
 * the same scrim, the same display type, the same blue primary.
 *
 * `gate` marks the diagnosis primary: it carries the hero's
 * account-first behavior — signed in it lands on /app/diagnose;
 * signed out, the click saves the return-to so the diagnosis
 * account gate's bounce to /login lands back on the diagnosis.
 * On-image colors stay self-contained literals (globals.css rule).
 */
export function HomeFeature({
  loop,
  image,
  title,
  line,
  cta,
  href,
  gate = false,
}: {
  loop?: LoopName;
  image?: string;
  title: string;
  line: string;
  cta: string;
  href: string;
  gate?: boolean;
}) {
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
    <section className="relative flex min-h-[88svh] flex-col overflow-hidden bg-black sm:min-h-[100svh]">
      {loop ? (
        <LoopClip name={loop} fill />
      ) : (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,8,0.42)_0%,rgba(5,6,8,0.16)_45%,rgba(5,6,8,0.42)_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
          {title}
        </h2>
        <p className="mt-4 text-lg text-white/90 sm:text-xl">{line}</p>
        <Link
          href={href}
          onClick={gate ? saveReturnTo : undefined}
          className="mt-10 inline-flex h-[52px] items-center rounded-lg bg-[#2563eb] px-9 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
