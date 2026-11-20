"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { apiFetch } from "@/lib/client/api";
import { trackEvent } from "@/lib/client/analytics";
import { getToken } from "@/lib/client/auth";
import { savePlanIntent } from "@/lib/client/planIntent";

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
 *
 * Conversion pass (2026-11-20, owner-approved audit): the full
 * variant gains the two things /pricing was missing —
 *   - the one-problem line above the plans (pricing.singleLine)
 *     and a proper SINGLE DIAGNOSIS block under them: the $4
 *     one-time door, priced from the catalog (pricing.single),
 *     whose button runs the SAME checkout the dashboard's billing
 *     card runs (POST /api/payments/create-checkout, plan
 *     "credit") for a signed-in driver, and sends a signed-out
 *     visitor to /register?plan=single with the intent saved;
 *   - plan intent on the Pro CTA: "Start Pro" records "pro"
 *     (lib/client/planIntent) and lands a signed-in driver on
 *     /app#billing, a signed-out visitor on /register?plan=pro —
 *     either way the choice survives signup and the billing card
 *     highlights the Pro upgrade.
 * Pro also gains its subhead (pricing.pro.sub — who Pro is for)
 * and its period now carries the cancel-anytime truth.
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
  sub?: string;
  badge?: string;
  points: string[];
  cta: string;
  href: string;
  onCtaClick?: () => void;
  featured: boolean;
}

export function PlanCards({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { t } = useLocale();
  const p = t.pricing;
  const [signedIn, setSignedIn] = useState(false);
  const [buyingSingle, setBuyingSingle] = useState(false);
  const [singleError, setSingleError] = useState(false);

  useEffect(() => {
    setSignedIn(getToken() !== null);
  }, []);

  // The single-diagnosis door for a signed-in driver: the exact
  // checkout the dashboard billing card starts (same route, same
  // plan word, same funnel event) — /pricing never invents a
  // second purchase path.
  async function buySingle() {
    setBuyingSingle(true);
    setSingleError(false);
    const res = await apiFetch<{ url: string }>("/api/payments/create-checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "credit" }),
    });
    if (res.status === 200 && res.data.url) {
      trackEvent("checkout_started", { product: "single_credit" });
      window.location.href = res.data.url;
      return;
    }
    setBuyingSingle(false);
    setSingleError(true);
  }

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
      sub: p.pro.sub,
      badge: p.popularBadge,
      points: [p.pro.point1, p.pro.point2, p.pro.point3, p.pro.point4],
      cta: p.pro.cta,
      href: signedIn ? "/app#billing" : "/register?plan=pro",
      onCtaClick: () => savePlanIntent("pro"),
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
    {/* The one-problem line (conversion pass, 2026-11-20): most
        visitors have ONE repair to check, not a subscription to
        shop for — the free start is named before the plans. */}
    {variant === "full" && (
      <p className="mb-10 text-center font-display text-xl font-medium text-ink-1">
        {p.singleLine}
      </p>
    )}
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
          {plan.sub && (
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{plan.sub}</p>
          )}
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
              onClick={plan.onCtaClick}
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
    {/* The single-diagnosis block (conversion pass, 2026-11-20):
        the one-time door, priced from the catalog like every
        plan — it was previously named only in an FAQ with no
        price and no way to buy it from this page. */}
    {variant === "full" && (
      <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-line bg-surface p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-1">{p.single.name}</h3>
          <p className="mt-2">
            <span className="tnum font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
              {p.single.price}
            </span>
            <span className="mt-1.5 block text-sm text-ink-3">{p.single.period}</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{p.single.tagline}</p>
          {singleError && (
            <p className="mt-3 text-sm text-ink-1" role="alert">
              {t.wp6.common.somethingWrong}
            </p>
          )}
        </div>
        {signedIn ? (
          <button
            type="button"
            onClick={() => void buySingle()}
            disabled={buyingSingle}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-bright disabled:opacity-60"
          >
            {p.single.cta}
          </button>
        ) : (
          <Link
            href="/register?plan=single"
            onClick={() => savePlanIntent("single")}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-bright"
          >
            {p.single.cta}
          </Link>
        )}
      </div>
    )}
    {/* The guarantee badge (Pass #20, the FIXD lesson) — full
        variant only, one line under the plans. Wording is the
        catalog's (pricing.guarantee): since the conversion pass
        (2026-11-20) it states the owner's actual policy — email
        support within 14 days for a refund or an account credit —
        the same policy /terms now publishes in its Billing
        section. */}
    {variant === "full" && (
      <p className="mt-8 text-center text-base leading-relaxed text-ink-2">
        <span className="font-semibold text-ink-1">{t.pricing.guaranteeLabel}</span>{" "}
        {t.pricing.guarantee}
      </p>
    )}
    </>
  );
}
