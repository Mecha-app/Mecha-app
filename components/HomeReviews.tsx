"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { REVIEWS, REVIEWS_ARE_SAMPLES, reviewsVisible } from "@/lib/reviews";
import { useCarousel } from "@/lib/client/useCarousel";

/**
 * Homepage reviews carousel (pass #19 follow-up, 2026-11-17,
 * owner: "make it visible, like the competitor sites").
 *
 * DATA-DRIVEN from lib/reviews — the single source. Today that
 * source holds SAMPLE reviews (MECHA has no real, permissioned
 * customer reviews yet), so the section carries a visible
 * "Sample reviews" badge for exactly as long as the samples
 * are in. When the first real review lands, the samples come
 * out wholesale and the badge goes with them (the rule is
 * written in lib/reviews). No aggregate claims, no counts, no
 * average rating, no "verified" badges — individual reviews
 * only. With zero entries the section renders nothing at all.
 *
 * Rotation is the shared carousel (lib/client/useCarousel):
 * auto-advance, swipe, dots, prev/next.
 */

function StarRow({ stars }: { stars: number }) {
  return (
    <div className="flex justify-center gap-1" aria-label={`${stars} / 5`}>
      {Array.from({ length: stars }, (_, i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#2563eb" aria-hidden="true">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

export function HomeReviews() {
  const { t } = useLocale();
  const r = t.reviews;
  const c = useCarousel(REVIEWS.length, 5500);

  if (!reviewsVisible(REVIEWS)) return null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{r.eyebrow}</p>
        <h2 className="mt-4 text-balance font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
          {r.title}
        </h2>
        {REVIEWS_ARE_SAMPLES ? (
          <p className="mt-5">
            <span className="inline-flex items-center rounded-full border-2 border-accent px-4 py-1.5 font-display text-sm font-semibold text-accent">
              {r.sampleBadge}
            </span>
          </p>
        ) : null}

        <div
          className="mt-10 overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label={r.title}
          onTouchStart={c.onTouchStart}
          onTouchEnd={c.onTouchEnd}
          onMouseEnter={c.onMouseEnter}
          onMouseLeave={c.onMouseLeave}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${c.index * 100}%)` }}
          >
            {REVIEWS.map((review) => (
              <figure key={review.name} className="w-full shrink-0 px-2 sm:px-8">
                <StarRow stars={review.stars} />
                <blockquote className="mx-auto mt-5 max-w-2xl text-balance font-display text-xl font-medium leading-snug text-ink-1 sm:text-2xl">
                  “{review.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm text-ink-2">
                  <span className="font-semibold text-ink-1">{review.name}</span>
                  {" · "}
                  {review.car}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={c.prev}
            aria-label={r.prevLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-1 transition-colors hover:bg-bg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex gap-2">
            {REVIEWS.map((review, i) => (
              <button
                key={review.name}
                type="button"
                onClick={() => c.goTo(i)}
                aria-label={`${i + 1}`}
                aria-current={i === c.index}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i === c.index ? "bg-[#2563eb]" : "bg-border"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={c.next}
            aria-label={r.nextLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-ink-1 transition-colors hover:bg-bg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
