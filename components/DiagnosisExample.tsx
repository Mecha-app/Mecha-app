"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/**
 * "Inside a diagnosis" — a faithful render of the product's real report
 * (design pass 2). The panel mirrors the /app/diagnose report card
 * field for field — severity verdict (verdict colors are product
 * semantics, §1.2: always with a word, never color alone), the
 * safe-to-drive line, the plain-language explanation, the fair repair
 * range, ranked likely causes, next steps, the technician's tip, and
 * the standing disclaimer. The content is ONE example problem, labeled
 * as illustrative in every locale — not a statistic, not a testimonial,
 * not a real customer's report (claims discipline, §1.6).
 */
export function DiagnosisExample() {
  const { t } = useLocale();
  const r = t.reportExample;

  const parts = [r.parts.coil, r.parts.plugs, r.parts.injector];
  const steps = [r.step1, r.step2, r.step3];

  return (
    <section id="diagnosis-example" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{r.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {r.heading}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{r.body}</p>
          </div>
        </Reveal>

        <Reveal>
          <div className="mx-auto mt-14 max-w-2xl text-center lg:mt-16">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-ink-3">
              {r.symptomLabel}
            </p>
            <p className="mt-3 font-display text-[22px] font-medium leading-snug text-ink-1">
              {r.symptom}
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-line bg-surface p-6 text-left sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-base font-semibold text-verdict-warn">
                  {r.severity}
                </span>
                <span className="text-sm text-ink-2">{r.safeLine}</span>
              </div>
              <span className="rounded border border-line bg-inset px-2 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-ink-3">
                {r.exampleLabel}
              </span>
            </div>

            <p className="mt-4 leading-relaxed text-ink-1">{r.diagnosis}</p>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line pt-5">
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-ink-3">
                {r.fairRangeLabel}
              </span>
              <span className="tnum font-display text-[26px] font-semibold text-ink-1">
                {r.fairRangeValue}
              </span>
            </div>

            <h3 className="mt-7 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {r.partsTitle}
            </h3>
            <div className="mt-2 divide-y divide-line">
              {parts.map((part) => (
                <div key={part.name} className="py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-medium text-ink-1">
                      {part.name}
                      <span className="ml-2 text-[13px] font-normal text-ink-3">
                        {part.likelihood}
                      </span>
                    </p>
                    <p className="tnum font-display text-base font-semibold text-ink-1">
                      {part.cost}
                    </p>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{part.desc}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {r.stepsTitle}
            </h3>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 leading-relaxed text-ink-1">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>

            <div className="mt-6 rounded-xl bg-inset px-4 py-3.5">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-ink-3">
                {r.tipLabel}
              </p>
              <p className="mt-1.5 leading-relaxed text-ink-1">{r.tip}</p>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-ink-3">{r.disclaimer}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
