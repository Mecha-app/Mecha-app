"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/** Pillar icons — drawn for MECHA's verbs (§1.6 icon set): gauge (Diagnose),
 *  shield-price (Protect), vault/archive (Remember). 1.75px stroke. */
const ICON_PROPS = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--color-accent)",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function GaugeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="M12 14l4.5-4.5" />
      <circle cx="12" cy="14" r="1.4" />
      <path d="M3 18h18" />
    </svg>
  );
}
function ShieldPriceIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3l7 2.8v5.4c0 4.5-3 7.6-7 9.3-4-1.7-7-4.8-7-9.3V5.8L12 3z" />
      <path d="M12 8v8M14.6 9.6c-.6-.7-1.5-1-2.6-1-1.5 0-2.6.8-2.6 1.9 0 2.6 5.3 1.4 5.3 4 0 1.1-1.2 1.9-2.7 1.9-1.1 0-2.1-.4-2.7-1.1" />
    </svg>
  );
}
function VaultIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M3.5 10h17" />
      <circle cx="12" cy="14.5" r="1.6" />
    </svg>
  );
}

function PillarColumn({
  index,
  icon,
  title,
  body,
  points,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  points: string[];
}) {
  return (
    <article className="border-t border-line pt-9">
      <div className="flex items-start justify-between">
        {icon}
        <span className="tnum font-display text-sm font-semibold tracking-[0.22em] text-ink-3">
          {index}
        </span>
      </div>
      <h3 className="mt-7 font-display text-[28px] font-medium leading-tight text-ink-1">
        {title}
      </h3>
      <p className="mt-4 leading-relaxed text-ink-2">{body}</p>
      <ul className="mt-7 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
            <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * The three pillars — Diagnose / Protect / Remember (REDESIGN_PLAN).
 * Design-elevation pass 1: no cards, no boxes — three hairline-topped
 * columns with room to breathe; depth from rules and spacing (§1.1),
 * never from card chrome.
 */
export function Pillars() {
  const { t } = useLocale();
  const p = t.pillars;

  return (
    <section id="pillars" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{p.eyebrow}</p>
          <h2 className="mt-4 font-display text-[clamp(2.1rem,4.5vw,3.4rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
            {p.heading}
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10 lg:mt-20">
          <Reveal delay={0}>
            <PillarColumn
              index="01"
              icon={<GaugeIcon />}
              title={p.diagnose.title}
              body={p.diagnose.body}
              points={[p.diagnose.point1, p.diagnose.point2, p.diagnose.point3]}
            />
          </Reveal>
          <Reveal delay={130}>
            <PillarColumn
              index="02"
              icon={<ShieldPriceIcon />}
              title={p.protect.title}
              body={p.protect.body}
              points={[p.protect.point1, p.protect.point2, p.protect.point3]}
            />
          </Reveal>
          <Reveal delay={260}>
            <PillarColumn
              index="03"
              icon={<VaultIcon />}
              title={p.remember.title}
              body={p.remember.body}
              points={[p.remember.point1, p.remember.point2, p.remember.point3]}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
