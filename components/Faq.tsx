"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/** Plus marker — drawn line icon (§1.6); rotates to a × when open. */
function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-45"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * FAQ (design pass 2) — the real objections, answered straight:
 * accuracy (with the standing not-a-substitute-for-a-mechanic honesty),
 * the free meter's end, the no-reset rule, hardware, languages,
 * privacy, and the business door. Native <details> — accessible,
 * works without JS, summaries are full-height tap targets.
 */
export function Faq() {
  const { t } = useLocale();
  const f = t.faq;

  const items = [
    f.items.accuracy,
    f.items.freeEnd,
    f.items.reset,
    f.items.hardware,
    f.items.languages,
    f.items.privacy,
    f.items.business,
  ];

  return (
    <section id="faq" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{f.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {f.heading}
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <div className="mx-auto mt-14 max-w-3xl border-b border-line lg:mt-16">
            {items.map((item) => (
              <details key={item.q} className="group border-t border-line">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-medium text-ink-1 [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <PlusIcon />
                </summary>
                <p className="pb-6 pr-8 leading-relaxed text-ink-2">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
