"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Pillar icons — drawn for MECHA's verbs (§1.6 icon set): gauge (Diagnose),
 *  shield-price (Protect), vault/archive (Remember). 1.75px stroke. */
const ICON_PROPS = {
  width: 26,
  height: 26,
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

function PillarCard({
  icon,
  title,
  body,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  points: string[];
}) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-inset">{icon}</div>
      <h3 className="mt-5 font-display text-xl font-medium text-ink-1">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{body}</p>
      <ul className="mt-5 space-y-2 border-t border-line pt-4">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-sm text-ink-2">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** The three pillars — Diagnose / Protect / Remember (REDESIGN_PLAN). */
export function Pillars() {
  const { t } = useLocale();
  const p = t.pillars;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{p.eyebrow}</p>
        <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.02em] text-ink-1">
          {p.heading}
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <PillarCard
            icon={<GaugeIcon />}
            title={p.diagnose.title}
            body={p.diagnose.body}
            points={[p.diagnose.point1, p.diagnose.point2, p.diagnose.point3]}
          />
          <PillarCard
            icon={<ShieldPriceIcon />}
            title={p.protect.title}
            body={p.protect.body}
            points={[p.protect.point1, p.protect.point2, p.protect.point3]}
          />
          <PillarCard
            icon={<VaultIcon />}
            title={p.remember.title}
            body={p.remember.body}
            points={[p.remember.point1, p.remember.point2, p.remember.point3]}
          />
        </div>
      </div>
    </section>
  );
}
