"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * PlanCards — the ONE professional pricing presentation (design
 * pass #8, 2026-11-16, owner verdict on the old surfaces: "the
 * prices, the way they presented, they not professional — it needs
 * to be changed"). Every surface that shows a price renders these
 * cards, so a plan looks the same everywhere it appears:
 *
 *   - /pricing (components/Pricing.tsx) — the full variant: plan
 *     name, the price large with its period, a checkmark list of
 *     what is included, one clear CTA per card.
 *   - the homepage strip (components/HomePlans.tsx) — the compact
 *     variant: the same cards with the headline point only; the
 *     strip's own button carries the reader to /pricing.
 *   - the dashboard's Plan & billing card reuses this price
 *     typography for the current plan (components/BillingSection).
 *
 * Every string comes from the pricing catalog (t.pricing) — names,
 * prices, periods, points, CTAs — so no surface can drift from
 * what /pricing charges. Pro is the highlighted card: blue border
 * + the catalog's "Most popular" badge. Shops is the business
 * card, badged from its catalog entry. TRUE features only: the
 * points are the catalog's own, never invented here.
 */

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

interface Plan {
  key: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  points: string[];
  cta: string;
  href: string;
  featured: boolean;
}

export function PlanCards({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { t } = useLocale();
  const p = t.pricing;

  const plans: Plan[] = [
    {
      key: "free",
      name: p.free.name,
      price: p.free.price,
      period: p.free.period,
      points: [p.free.point1, p.free.point2, p.free.point3, p.free.point4],
      cta: p.free.cta,
      href: "/register",
      featured: false,
    },
    {
      key: "pro",
      name: p.pro.name,
      price: p.pro.price,
      period: p.pro.period,
      badge: p.popularBadge,
      points: [p.pro.point1, p.pro.point2, p.pro.point3, p.pro.point4],
      cta: p.pro.cta,
      href: "/register",
      featured: true,
    },
    {
      key: "shops",
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
    <>
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.key}
          className={
            plan.featured
              ? "relative flex h-full flex-col rounded-2xl border-2 border-accent bg-surface p-7"
              : "relative flex h-full flex-col rounded-2xl border border-line bg-surface p-7"
          }
        >
          {plan.badge && (
            <span
              className={
                plan.featured
                  ? "absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-eyebrow text-accent-ink"
                  : "absolute -top-3 left-7 rounded-full bg-inset px-3 py-1 text-[11px] font-semibold uppercase tracking-eyebrow text-ink-2"
              }
            >
              {plan.badge}
            </span>
          )}
          <h3 className="font-display text-lg font-semibold text-ink-1">{plan.name}</h3>
          <p className="mt-4">
            <span className="tnum font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
              {plan.price}
            </span>
            <span className="mt-1.5 block text-sm text-ink-3">{plan.period}</span>
          </p>
          <ul className="mt-6 flex-1 space-y-3">
            {(variant === "compact" ? plan.points.slice(0, 1) : plan.points).map((point) => (
              <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <span className="text-accent">
                  <CheckIcon />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {variant === "full" && (
            <Link
              href={plan.href}
              className={
                plan.featured
                  ? "mt-8 inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-bright"
                  : "mt-8 inline-flex h-12 items-center justify-center rounded-full border border-line px-8 font-display text-base font-medium text-ink-1 transition-colors duration-150 hover:border-ink-3"
              }
            >
              {plan.cta}
            </Link>
          )}
        </article>
      ))}
    </div>
    {/* The guarantee badge (Pass #20, the FIXD lesson) — full
        variant only, one line under the plans. Honest "make it
        right" language from the catalog (pricing.guarantee): a
        standing offer to fix a paid report that didn't help, NOT a
        formal refund policy with terms Frantz hasn't set. */}
    {variant === "full" && (
      <p className="mt-8 text-center text-base leading-relaxed text-ink-2">
        <span className="font-semibold text-ink-1">{t.pricing.guaranteeLabel}</span>{" "}
        {t.pricing.guarantee}
      </p>
    )}
    </>
  );
}
