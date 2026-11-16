"use client";

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

/**
 * The spoken-dialogue film (VIDEO_SET_3), in its own section directly
 * under the hero. Its value is hearing the driver, his friend, and
 * the mechanic talk, so it plays ONLY on demand — poster-first,
 * click-to-play WITH SOUND, native controls once playing, back to
 * the poster when it ends. Per the owner's hard rule nothing is laid
 * over the picture beyond the standard play affordance.
 *
 * Until design pass "Hero" (2026-11-16) this player lived inside the
 * hero itself; the hero is now the looping product-in-use visual, so
 * the film keeps its own framed section here — same film, same
 * behavior, one scroll down.
 */
export function HeroFilm() {
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
    <section aria-label={t.hero.watchCta}>
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6">
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
    </section>
  );
}
