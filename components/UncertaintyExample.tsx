"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HumanHelpCard } from "./HumanHelpCard";
import { Reveal } from "./Reveal";

/**
 * "When MECHA can't narrow it down, it says so" (pass #19,
 * 2026-11-17, owner order — evidence of quality, the honest
 * half). One worked example of a LOW-CONFIDENCE result, rendered
 * the way the product presents it: every fitting cause stays on
 * the list marked possible, the price stays ONE wide range, and
 * the report names the extra information that would separate
 * the causes — instead of picking one and sounding sure. The
 * example is labeled illustrative in every locale, like the
 * other example surfaces; it is not a real customer's report.
 *
 * CUSTOMER STORIES DROP IN HERE: this section is the evidence
 * surface. When MECHA has real customers who give permission,
 * their stories render from the `stories` prop (quote, name,
 * car — permissioned only). Today the prop is empty BY DESIGN:
 * MECHA has no permissioned stories yet, and none are invented —
 * no names, no quotes, no ratings, no counts. An empty list
 * renders nothing, so the section ships honest and the stories
 * slot in without a redesign when they exist.
 */
export interface CustomerStory {
  quote: string;
  name: string;
  car: string;
}

export function UncertaintyExample({
  bare = false,
  audience = "public",
  stories = [],
}: {
  /** Inside the guided demo the step title is the heading —
   *  render the example card without the section header. */
  bare?: boolean;
  audience?: "public" | "app";
  stories?: CustomerStory[];
}) {
  const { t } = useLocale();
  const u = t.uncertainty;
  const r = t.reportExample;

  const causes = [u.cause1, u.cause2, u.cause3];
  const helps = [u.help1, u.help2, u.help3];

  const card = (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-line bg-surface p-6 text-start sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-ink-3">
            {r.symptomLabel}
          </p>
          <span className="rounded border border-line bg-inset px-2 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-ink-3">
            {r.exampleLabel}
          </span>
        </div>
        <p className="mt-3 font-display text-[22px] font-medium leading-snug text-ink-1">
          {u.symptom}
        </p>

        <p className="mt-5 leading-relaxed text-ink-1">{u.answerBody}</p>

        <div className="mt-5 divide-y divide-line border-t border-line">
          {causes.map((cause) => (
            <p key={cause} className="py-3 font-medium text-ink-1">
              {cause}
            </p>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line pt-5">
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-ink-3">
            {r.fairRangeLabel}
          </span>
          <span className="tnum font-display text-[26px] font-semibold text-ink-1">
            {u.rangeValue}
          </span>
        </div>

        <h3 className="mt-7 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
          {u.helpsTitle}
        </h3>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 ps-5 leading-relaxed text-ink-1">
          {helps.map((help) => (
            <li key={help}>{help}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <HumanHelpCard variant="unsure" audience={audience} />
      </div>

      {stories.length > 0 ? (
        <div className="mt-10 flex flex-col gap-6">
          {stories.map((story) => (
            <figure
              key={story.name}
              className="rounded-2xl border border-line bg-surface p-6 sm:p-8"
            >
              <blockquote className="leading-relaxed text-ink-1">{story.quote}</blockquote>
              <figcaption className="mt-3 text-sm text-ink-3">
                {story.name} — {story.car}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (bare) return card;

  return (
    <section id="honest-answers" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
              {u.eyebrow}
            </p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {u.heading}
            </h2>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-14 lg:mt-16">{card}</div>
        </Reveal>
      </div>
    </section>
  );
}
