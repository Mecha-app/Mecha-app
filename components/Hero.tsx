"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Small check drawn icon — MECHA line set (§1.6). */
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Homepage hero (route `/`, blueprint §2.1): the produced hero explainer
 * film up front (owner-ordered, files/videos/), Scan as the primary CTA,
 * three honest product points — no stats, no testimonials (§1.6 claims
 * discipline).
 */
export function Hero() {
  const { t } = useLocale();
  const points = [t.hero.points.noHardware, t.hero.points.plainLanguage, t.hero.points.freeToStart];

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
            {t.hero.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1 sm:text-[48px] lg:text-[56px]">
            {t.hero.titleLine1}
            <br />
            {t.hero.titleLine2}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">{t.hero.sub}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app/scan"
              className="inline-flex h-12 items-center rounded-md bg-accent px-6 font-display text-base font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
            >
              {t.hero.scanCta}
            </Link>
            <a
              href="#fair-price"
              className="inline-flex h-12 items-center rounded-md border border-line bg-surface px-6 font-display text-base font-medium text-ink-1 transition-colors duration-150 hover:border-ink-3"
            >
              {t.hero.filmFairPrice}
            </a>
          </div>

          <ul className="mt-8 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-ink-2">
                <CheckIcon />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <figure className="overflow-hidden rounded-xl border border-line bg-surface">
          <video
            className="aspect-video w-full bg-black"
            controls
            preload="none"
            poster="/videos/mecha-hero-poster.webp"
            aria-label={t.hero.watchCta}
          >
            <source src="/videos/mecha-hero-explainer.mp4" type="video/mp4" />
          </video>
          <figcaption className="flex items-center justify-between px-4 py-3 text-[13px] text-ink-3">
            <span className="font-medium text-ink-2">{t.hero.watchCta}</span>
            <span className="font-mono text-[11px] uppercase tracking-eyebrow">MECHA</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
