"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/**
 * "How it works" — the diagnosis flow, step by step (design pass 2,
 * owner feedback 2026-11-03: the homepage was too short to convince).
 * Substance, not clutter (§1.1): four hairline columns in the pillars'
 * rhythm, then the full contents of a diagnosis as a plain checklist.
 * Every claim is the product's real behavior — the report shape is the
 * WP5 diagnosis report (severity / ranked causes / fair range / steps /
 * tip), and the severity words are the product's own three verdicts.
 */
export function HowItWorks() {
  const { t } = useLocale();
  const h = t.howItWorks;

  const steps = [
    { n: "01", title: h.steps.describe.title, body: h.steps.describe.body },
    { n: "02", title: h.steps.ranked.title, body: h.steps.ranked.body },
    { n: "03", title: h.steps.severity.title, body: h.steps.severity.body },
    { n: "04", title: h.steps.price.title, body: h.steps.price.body },
  ];
  const includes = [
    h.includes.explanation,
    h.includes.causes,
    h.includes.severity,
    h.includes.cost,
    h.includes.labor,
    h.includes.steps,
    h.includes.tip,
    h.includes.saved,
  ];

  return (
    <section id="how-it-works" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{h.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {h.heading}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{h.body}</p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4 lg:gap-10">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <article className="border-t border-line pt-8">
                <span className="tnum font-display text-sm font-semibold tracking-[0.22em] text-accent">
                  {s.n}
                </span>
                <h3 className="mt-5 font-display text-xl font-medium leading-snug text-ink-1">
                  {s.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-20 border-t border-line pt-10 lg:mt-24">
            <h3 className="text-center font-display text-2xl font-medium text-ink-1">
              {h.includesTitle}
            </h3>
            <ul className="mx-auto mt-9 grid max-w-4xl gap-x-10 gap-y-4 sm:grid-cols-2">
              {includes.map((item) => (
                <li key={item} className="flex gap-2.5 leading-relaxed text-ink-2">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
