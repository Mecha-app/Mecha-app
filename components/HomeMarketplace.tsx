"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Homepage marketplace section — design pass #6's full-picture
 * section, with the visual REPLACED (2026-11-18, owner: "make a
 * video that explains the product, make sure it talks… replace
 * [the stock photo] with a video that explains the product"): the
 * ~60-second MECHA explainer — a narrated film (professional voice,
 * word-for-word captions burned in) whose scenes show exactly what
 * the voice describes: the noise and the $780 quote, the dashboard
 * photo, the answer on the phone, the shop conversation, the saved
 * history and the guided photo set this section sells.
 *
 * Two modes, one film:
 *  - AMBIENT (default): the film is the section's full-bleed
 *    background — muted, looping, lazy-loaded only when the section
 *    approaches the viewport, paused off-screen, poster first.
 *  - WITH SOUND (the owner's first-class control): the prominent
 *    "Watch with sound" button restarts the film from the beginning
 *    UNMUTED — narration + captions — because browsers block
 *    autoplay-with-sound, the sound pass is always a deliberate
 *    tap, never faked. When the narrated pass ends, or the viewer
 *    taps Mute, the section settles back into the ambient loop.
 * Headline, line, and the Browse cars button are unchanged.
 */
export function HomeMarketplace() {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const soundRef = useRef(false);
  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [withSound, setWithSound] = useState(false);

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ensureLoaded = () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoaded(true);
  };

  // Once the sources mount, load them and start the ambient pass
  // (unless the viewer already asked for sound, or prefers reduced
  // motion — then the poster simply holds until they tap).
  useEffect(() => {
    if (!loaded) return;
    const v = videoRef.current;
    if (!v) return;
    v.load();
    if (!soundRef.current && !reducedMotion()) {
      v.play().catch(() => undefined);
    }
  }, [loaded]);

  // Lazy-load near the viewport; pause the ambient pass off-screen
  // so the film never costs data nobody is watching. The sound pass
  // is left alone — a viewer listening is a viewer staying.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          ensureLoaded();
          if (loadedRef.current && !soundRef.current && !reducedMotion()) {
            v.play().catch(() => undefined);
          }
        } else if (!soundRef.current) {
          v.pause();
        }
      },
      { rootMargin: "240px", threshold: 0.05 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const watchWithSound = () => {
    ensureLoaded();
    const v = videoRef.current;
    if (!v) return;
    soundRef.current = true;
    setWithSound(true);
    v.loop = false;
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => undefined);
  };

  const backToAmbient = () => {
    const v = videoRef.current;
    soundRef.current = false;
    setWithSound(false);
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.play().catch(() => undefined);
  };

  const onEnded = () => {
    // The narrated pass finished: hand the section back to the
    // muted ambient loop, from the top.
    const v = videoRef.current;
    soundRef.current = false;
    setWithSound(false);
    if (!v) return;
    v.muted = true;
    v.loop = true;
    v.currentTime = 0;
    v.play().catch(() => undefined);
  };

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/videos/explainer-poster.jpg"
        aria-hidden={!withSound}
        onEnded={onEnded}
      >
        {loaded ? (
          <>
            <source src="/videos/mecha-explainer.webm" type="video/webm" />
            <source src="/videos/mecha-explainer.mp4" type="video/mp4" />
          </>
        ) : null}
      </video>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,6,8,0.42)_0%,rgba(5,6,8,0.16)_45%,rgba(5,6,8,0.42)_100%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <h2 className="mx-auto max-w-3xl font-display text-[clamp(2.2rem,5vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.02em] text-white">
          {t.hero.marketTitle}
        </h2>
        <p className="mt-4 text-lg text-white/90 sm:text-xl">{t.hero.marketLine}</p>
        <Link
          href="/marketplace"
          className="mt-10 inline-flex h-[52px] items-center rounded-lg bg-[#2563eb] px-9 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
        >
          {t.hero.marketCta}
        </Link>
        {withSound ? (
          <button
            type="button"
            onClick={backToAmbient}
            className="mt-5 inline-flex h-[52px] items-center gap-2.5 rounded-lg border border-white/50 bg-black/45 px-8 font-display text-base font-semibold text-white backdrop-blur transition-colors duration-150 hover:bg-black/60"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path
                d="M16 8l6 8M22 8l-6 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {t.hero.soundOff}
          </button>
        ) : (
          <button
            type="button"
            onClick={watchWithSound}
            className="mt-5 inline-flex h-[52px] items-center gap-2.5 rounded-lg bg-white px-8 font-display text-base font-semibold text-black shadow-lg transition-colors duration-150 hover:bg-white/85"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path
                d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {t.hero.watchWithSound}
          </button>
        )}
      </div>
    </section>
  );
}
