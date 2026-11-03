"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Play glyph — MECHA line set (§1.6). */
function PlayIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
 * Homepage hero (route `/`, blueprint §2.1) — the dialogue film.
 *
 * The hero film is now the spoken-dialogue film (VIDEO_SET_3): its
 * value is hearing the driver, his friend, and the mechanic talk, so
 * it plays ONLY on demand — poster-first, click-to-play WITH SOUND,
 * native controls once playing, back to the poster when it ends. No
 * muted autoplay backdrop, and per the owner's hard rule nothing is
 * laid over the picture: the promise copy and actions live in the
 * layout above the player, exactly like every big-brand hero. One
 * film in the hero, ever — this replaced the set-#1 explainer.
 */
export function Hero() {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function playFilm() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    void video.play();
    setPlaying(true);
  }

  function filmEnded() {
    videoRef.current?.load(); // back to the poster
    setPlaying(false);
  }

  return (
    <section className="hero-scope relative overflow-hidden">
      {/* The promise — centered, oversized, unhurried, ABOVE the film. */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-28 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
          {t.hero.eyebrow}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2.9rem,6.5vw,5.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-1">
          {t.hero.titleLine1}
          <br />
          {t.hero.titleLine2}
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-ink-2 sm:text-xl">
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
      </div>

      {/* The film — a framed player under the copy. Poster first; the
          only thing on the poster is the standard play affordance. */}
      <div className="relative z-10 mx-auto mt-14 w-full max-w-5xl px-4 sm:px-6">
        <figure className="relative overflow-hidden rounded-2xl border border-line">
          <video
            ref={videoRef}
            className="aspect-video w-full bg-black"
            playsInline
            preload="none"
            poster="/videos/hero-dialogue-poster.webp"
            controls={playing}
            onEnded={filmEnded}
            aria-label={t.hero.watchCta}
          >
            <source src="/videos/hero-dialogue.mp4" type="video/mp4" />
          </video>
          {!playing && (
            <button
              type="button"
              onClick={playFilm}
              aria-label={t.hero.watchCta}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="inline-flex min-h-[56px] items-center gap-3 rounded-full bg-[rgb(11_13_16/0.72)] px-7 font-display text-base font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.03]">
                <PlayIcon />
                {t.hero.watchCta}
              </span>
            </button>
          )}
        </figure>
      </div>

      {/* Scroll cue — the page continues below the film. */}
      <div className="relative z-10 flex justify-center pb-6 pt-8">
        <a
          href="#pillars"
          aria-label={t.pillars.eyebrow}
          className="flex h-12 w-12 items-center justify-center text-ink-2 transition-colors duration-150 hover:text-ink-1"
        >
          <span className="scroll-cue block">
            <ChevronDownIcon />
          </span>
        </a>
      </div>
    </section>
  );
}
