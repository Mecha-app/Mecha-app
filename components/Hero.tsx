"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Play glyph — MECHA line set (§1.6). */
function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

/** Scroll cue chevron — drawn line icon (§1.6). */
function ChevronDownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 9 7 7 7-7" />
    </svg>
  );
}

/**
 * Homepage hero (route `/`, blueprint §2.1) — design-elevation pass 1.
 * Full-viewport cinematic treatment of the produced hero film
 * (files/videos/): the film runs as a muted, looping backdrop — the
 * product moment (driver, warning light, phone) IS the hero — under a
 * flat tonal scrim (§1.2: no gradients) and MECHA's own display type at
 * full confidence. "Watch how it works" promotes the same film to a
 * controlled, audible playback. Minimal words: eyebrow, the two-line
 * promise, one sentence, two actions. No stats, no testimonials
 * (§1.6 claims discipline). prefers-reduced-motion: no autoplay.
 */
export function Hero() {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
    }
  }, []);

  function watchFilm() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.loop = false;
    video.controls = true;
    video.currentTime = 0;
    void video.play();
    setWatching(true);
  }

  return (
    <section className="hero-scope relative flex min-h-[100svh] items-center overflow-hidden">
      {/* The film — full-bleed backdrop (poster first, for slow networks). */}
      <div className="absolute inset-0" aria-hidden={watching ? undefined : true}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/mecha-hero-poster.webp"
          aria-label={watching ? t.hero.watchCta : undefined}
        >
          <source src="/videos/mecha-hero-explainer.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="hero-scrim absolute inset-0" aria-hidden="true" />

      {/* The promise — centered, oversized, unhurried. */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-28 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
          {t.hero.eyebrow}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.9rem,6.5vw,5.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-1">
          {t.hero.titleLine1}
          <br />
          {t.hero.titleLine2}
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">
          {t.hero.sub}
        </p>

        <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/app/scan"
            className="inline-flex h-[52px] items-center rounded-full bg-accent px-9 font-display text-base font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
          >
            {t.hero.scanCta}
          </Link>
          <a
            href="#fair-price"
            className="btn-ghost inline-flex h-[52px] items-center rounded-full border border-line px-9 font-display text-base font-medium text-ink-1 transition-colors duration-150 hover:border-ink-3"
          >
            {t.hero.filmFairPrice}
          </a>
        </div>

        {!watching && (
          <button
            type="button"
            onClick={watchFilm}
            className="mt-9 inline-flex items-center gap-2.5 text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink-1"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line">
              <PlayIcon />
            </span>
            {t.hero.watchCta}
          </button>
        )}
      </div>

      {/* Scroll cue — the page continues below the film. */}
      <a
        href="#pillars"
        aria-label={t.pillars.eyebrow}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-ink-2 transition-colors duration-150 hover:text-ink-1"
      >
        <span className="scroll-cue block">
          <ChevronDownIcon />
        </span>
      </a>
    </section>
  );
}
