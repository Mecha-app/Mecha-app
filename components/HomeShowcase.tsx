"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LoopClip } from "./LoopClip";
import { useCarousel } from "@/lib/client/useCarousel";

/**
 * Homepage visual carousel (pass #19 follow-up, 2026-11-17,
 * owner: an auto-passing carousel of the product-in-use loops,
 * as a visual band in the proof area).
 *
 * The slides are MECHA's OWN loop clips — the same films the
 * bottom-of-page sections run (a diagnosis in the app, a quote
 * checked at the counter, the result shown to a mechanic, a
 * roadside moment, a recall alert) — reused, not re-filmed.
 * Auto-advance + swipe + dots via the shared carousel
 * (lib/client/useCarousel). Minimal text: one eyebrow, one
 * headline, nothing on the clips themselves.
 *
 * Placement is composition-only: the band sits in the proof
 * area (after the comparison, before the closing band). The
 * pass #17 order is untouched — the film sections still close
 * the page directly above the footer.
 */
const CLIPS = ["diagnose", "quote", "mechanic", "roadside", "alert"] as const;

export function HomeShowcase() {
  const { t } = useLocale();
  const s = t.showcase;
  const c = useCarousel(CLIPS.length, 4500);

  return (
    <section className="bg-bg">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{s.eyebrow}</p>
          <h2 className="mt-4 text-balance font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
            {s.title}
          </h2>
        </div>

        <div
          className="mt-10 overflow-hidden rounded-2xl"
          role="region"
          aria-roledescription="carousel"
          aria-label={s.title}
          onTouchStart={c.onTouchStart}
          onTouchEnd={c.onTouchEnd}
          onMouseEnter={c.onMouseEnter}
          onMouseLeave={c.onMouseLeave}
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${c.index * 100}%)` }}
          >
            {CLIPS.map((name) => (
              <div key={name} className="w-full shrink-0">
                <LoopClip name={name} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {CLIPS.map((name, i) => (
            <button
              key={name}
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
      </div>
    </section>
  );
}
