"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/** Businesses-band icons — MECHA line set (§1.6), 1.75px stroke:
 *  map pin (nearby shops), tow hook (towing). */
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

function PinIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 21s-6.8-5.3-6.8-10.6a6.8 6.8 0 0 1 13.6 0C18.8 15.7 12 21 12 21z" />
      <circle cx="12" cy="10.2" r="2.5" />
    </svg>
  );
}
function TowHookIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="16.5" cy="4.5" r="1.7" />
      <path d="M16.5 6.2v6.6a5.7 5.7 0 1 1-5.7-5.7" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

function NearbyColumn({
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
    <article className="border-t border-line pt-9">
      {icon}
      <h3 className="mt-6 font-display text-[28px] font-medium leading-tight text-ink-1">{title}</h3>
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
 * The businesses band (design pass 2): the nearby network the diagnosis
 * hands you to — shops and towing found by ZIP/location, name-first
 * listings, tap-to-call (the owner's nearby spec, 2026-11-03) — plus the
 * two doors in: list your business, browse the marketplace. Copy is the
 * shipped behavior of the WP6 nearby search and sell flow; no ratings,
 * counts, or coverage claims are invented (§1.6).
 */
export function Businesses() {
  const { t } = useLocale();
  const b = t.businesses;

  return (
    <section id="nearby" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{b.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {b.heading}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{b.body}</p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-12 md:grid-cols-2 lg:mt-20 lg:gap-16">
          <Reveal delay={0}>
            <NearbyColumn
              icon={<PinIcon />}
              title={b.shops.title}
              body={b.shops.body}
              points={[b.shops.point1, b.shops.point2, b.shops.point3]}
            />
          </Reveal>
          <Reveal delay={130}>
            <NearbyColumn
              icon={<TowHookIcon />}
              title={b.towing.title}
              body={b.towing.body}
              points={[b.towing.point1, b.towing.point2, b.towing.point3]}
            />
          </Reveal>
        </div>

        <div className="mt-20 grid gap-12 md:grid-cols-2 lg:mt-24 lg:gap-16">
          <Reveal delay={0}>
            <div className="border-t border-line pt-9">
              <h3 className="font-display text-2xl font-medium text-ink-1">{b.forBusiness.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-2">{b.forBusiness.body}</p>
              <Link
                href="/business/register"
                className="mt-4 inline-flex min-h-[48px] items-center gap-2 font-medium text-accent transition-colors duration-150 hover:text-accent-bright"
              >
                {b.forBusiness.cta}
                <ArrowIcon />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="border-t border-line pt-9">
              <h3 className="font-display text-2xl font-medium text-ink-1">{b.marketplace.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-2">{b.marketplace.body}</p>
              <Link
                href="/marketplace"
                className="mt-4 inline-flex min-h-[48px] items-center gap-2 font-medium text-accent transition-colors duration-150 hover:text-accent-bright"
              >
                {b.marketplace.cta}
                <ArrowIcon />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
