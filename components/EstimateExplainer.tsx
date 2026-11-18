"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/**
 * "How estimates work" (pass #19, 2026-11-17, owner order) — the
 * plain explanation of where a MECHA repair range comes from.
 *
 * Accuracy discipline: the text describes ONLY what the product
 * does today. The diagnosis engine is prompted with the driver's
 * vehicle and problem and returns a cost range plus labor hours
 * per repair (lib/server/ai.ts) — so the explainer says the AI
 * builds the range from the car, the parts the job needs, and
 * the labor time it should take. There is NO pricing database,
 * NO labor-rate table, and NO accuracy figure behind it, and
 * none is claimed. The three variation factors are the ones the
 * owner named: location (labor rates), vehicle (exact car), and
 * parts (OEM vs aftermarket, new vs remanufactured).
 */
export function EstimateExplainer() {
  const { t } = useLocale();
  const e = t.estimates;

  const factors = [
    { title: e.locationTitle, body: e.locationBody },
    { title: e.vehicleTitle, body: e.vehicleBody },
    { title: e.partsTitle, body: e.partsBody },
  ];

  return (
    <section id="how-estimates" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
              {e.eyebrow}
            </p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {e.heading}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{e.body}</p>
          </div>
        </Reveal>

        <div className="mx-auto mt-16 grid max-w-5xl gap-12 md:grid-cols-3 md:gap-10">
          {factors.map((factor, i) => (
            <Reveal key={factor.title} delay={i * 100}>
              <article className="border-t border-line pt-8">
                <h3 className="font-display text-2xl font-medium leading-tight text-ink-1">
                  {factor.title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink-2">{factor.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mx-auto mt-16 max-w-2xl text-center text-[15px] leading-relaxed text-ink-3">
            {e.note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
