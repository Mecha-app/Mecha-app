"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Homepage pricing strip — design pass #6 (2026-11-16, the
 * Audi-length pass). NOT a photo section: a clean light strip in
 * the steps section's rhythm — the three real plans in a row
 * (name, price, period, ONE short line each) and one button to
 * the full pricing page. Every string is reused from the pricing
 * catalog itself, so the strip can never drift from the prices
 * /pricing charges: Free (5 diagnoses), Pro per month, Shops per
 * month per location.
 */
export function HomePlans() {
  const { t } = useLocale();

  const plans = [
    { name: t.pricing.free.name, price: t.pricing.free.price, period: t.pricing.free.period, line: t.pricing.free.point1 },
    { name: t.pricing.pro.name, price: t.pricing.pro.price, period: t.pricing.pro.period, line: t.pricing.pro.point1 },
    { name: t.pricing.shops.name, price: t.pricing.shops.price, period: t.pricing.shops.period, line: t.pricing.shops.point1 },
  ];

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
          {plans.map((plan) => (
            <div key={plan.name} className="flex flex-col items-center px-2 text-center md:px-10">
              <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-ink-3">
                {plan.name}
              </h3>
              <p className="mt-3 font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
                {plan.price}
              </p>
              <p className="mt-1.5 text-sm text-ink-3">{plan.period}</p>
              <p className="mt-4 text-ink-2">{plan.line}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            href="/pricing"
            className="inline-flex h-[52px] items-center rounded-lg bg-[#2563eb] px-9 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
          >
            {t.hero.pricingCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
