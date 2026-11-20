"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * The homepage's one clean section below the hero — design pass #5
 * (2026-11-16). Treatment borrowed from the owner's SECOND
 * reference at his direction ("take some information from the
 * second into the first"): the heading "Three simple steps." and
 * three numbered steps — a numbered badge, a simple line icon, a
 * bold title, ONE short line each. On white, nothing else: the
 * heading, three titles, and three short lines are the whole
 * section.
 *
 * Icons follow the codebase's own icon pattern (Pillars.tsx):
 * hand-drawn 24×24 stroke geometry at 1.75px, round caps — there
 * is no icon-library dependency in this codebase. The stroke here
 * is the homepage's blue (#2563eb), a self-contained literal like
 * the primary buttons'.
 */
const STEP_ICON_PROPS = {
  width: 38,
  height: 38,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#2563eb",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function CarIcon() {
  return (
    <svg {...STEP_ICON_PROPS}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

function DescribeIcon() {
  return (
    <svg {...STEP_ICON_PROPS}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle cx="8" cy="10" r="0.4" fill="#2563eb" />
      <circle cx="12" cy="10" r="0.4" fill="#2563eb" />
      <circle cx="16" cy="10" r="0.4" fill="#2563eb" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg {...STEP_ICON_PROPS}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function HomeSteps() {
  const { t } = useLocale();

  const steps = [
    { n: 1, Icon: CarIcon, title: t.hero.step1Title, line: t.hero.step1Line },
    { n: 2, Icon: DescribeIcon, title: t.hero.step2Title, line: t.hero.step2Line },
    { n: 3, Icon: WrenchIcon, title: t.hero.step3Title, line: t.hero.step3Line },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-16 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] text-ink-1">
          {t.hero.stepsTitle}
        </h2>

        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
          {steps.map(({ n, Icon, title, line }) => (
            <div key={n} className="flex flex-col items-center px-2 text-center md:px-10">
              <div className="flex items-center gap-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
                  {n}
                </span>
                <Icon />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink-1">{title}</h3>
              <p className="mt-2 text-ink-2">{line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
