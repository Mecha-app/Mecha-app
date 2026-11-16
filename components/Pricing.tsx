"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

interface Tier {
  name: string;
  price: string;
  period: string;
  badge?: string;
  points: string[];
  cta: string;
  href: string;
  featured: boolean;
}

function TierColumn({ tier }: { tier: Tier }) {
  return (
    <article className="flex h-full flex-col border-t border-line pt-9">
      <p className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
        {tier.badge ?? " "}
      </p>
      <h3 className="mt-3 font-display text-[28px] font-medium leading-tight text-ink-1">
        {tier.name}
      </h3>
      <p className="mt-5">
        <span className="tnum font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
          {tier.price}
        </span>
        <span className="mt-1.5 block text-sm text-ink-3">{tier.period}</span>
      </p>
      <ul className="mt-7 flex-1 space-y-3">
        {tier.points.map((p) => (
          <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
            <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link
        href={tier.href}
        className={
          tier.featured
            ? "mt-9 inline-flex h-[52px] items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
            : "mt-9 inline-flex h-[52px] items-center justify-center rounded-full border border-line px-8 font-display text-base font-medium text-ink-1 transition-colors duration-150 hover:border-ink-3"
        }
      >
        {tier.cta}
      </Link>
    </article>
  );
}

/**
 * Pricing (design pass 2) — the trust surface the owner ordered held to
 * the pass-1 standard: clear prices, no gimmicks, no pressure. Three
 * hairline columns, not cards. The free tier's mechanics are explained
 * on the page itself — the visible meter, the countdown after every
 * diagnosis, and the identity rule (email + phone; re-registering does
 * not reset it) stated in plain words, because that honesty IS the
 * conversion (WP5 quota system; prices per the standing offer:
 * Free 5 lifetime / Pro $9.99 / Shops $149 per location).
 */
export function Pricing() {
  const { t } = useLocale();
  const p = t.pricing;

  const tiers: Tier[] = [
    {
      name: p.free.name,
      price: p.free.price,
      period: p.free.period,
      points: [p.free.point1, p.free.point2, p.free.point3, p.free.point4],
      cta: p.free.cta,
      href: "/register",
      featured: false,
    },
    {
      name: p.pro.name,
      price: p.pro.price,
      period: p.pro.period,
      badge: p.pro.badge,
      points: [p.pro.point1, p.pro.point2, p.pro.point3, p.pro.point4],
      cta: p.pro.cta,
      href: "/register",
      featured: true,
    },
    {
      name: p.shops.name,
      price: p.shops.price,
      period: p.shops.period,
      badge: p.shops.badge,
      points: [p.shops.point1, p.shops.point2, p.shops.point3, p.shops.point4],
      cta: p.shops.cta,
      href: "/business/register",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{p.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {p.heading}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{p.body}</p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-12 md:grid-cols-3 lg:mt-20 lg:gap-10">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 130} className="h-full">
              <TierColumn tier={tier} />
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mx-auto mt-20 max-w-2xl border-t border-line pt-10 text-center lg:mt-24">
            <h3 className="font-display text-xl font-medium text-ink-1">{p.meterTitle}</h3>
            <p className="mt-3 leading-relaxed text-ink-2">{p.meterNote}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
