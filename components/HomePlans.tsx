"use client";

import Link from "next/link";
import { PlanCards } from "./PlanCards";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Homepage pricing strip — design pass #6 introduced it as plain
 * columns; design pass #8 (2026-11-16) puts it on the ONE
 * professional pricing system: the strip renders the shared
 * PlanCards in their compact variant (the same white cards as
 * /pricing — plan name, the price large with its period, the
 * headline point with a checkmark, Pro badged "Most popular"),
 * so a price on the homepage looks exactly like the price on
 * /pricing. The strip's one button still carries the reader to
 * the full pricing page. Every string comes from the pricing
 * catalog via PlanCards — no price literal lives here, so the
 * strip can never drift from what /pricing charges.
 */
export function HomePlans() {
  const { t } = useLocale();

  return (
    <section className="bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <PlanCards variant="compact" />

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
