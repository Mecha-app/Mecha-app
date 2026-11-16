"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PlanCards } from "./PlanCards";
import { Reveal } from "./Reveal";

/**
 * Pricing — the trust surface the owner ordered held to the
 * professional standard. Since design pass #8 (2026-11-16, owner:
 * "the prices, the way they presented, they not professional — it
 * needs to be changed") the three standing plans render as the
 * shared PlanCards: clean white cards — plan name, the price
 * large with its period, a checkmark list of what is included,
 * one clear CTA per card, Pro highlighted as the popular choice.
 * The same cards (compact variant) carry the homepage strip, and
 * the dashboard's billing card reuses the price typography, so a
 * price looks the same everywhere.
 *
 * The free tier's mechanics are explained on the page itself —
 * the visible meter, the countdown after every diagnosis, and
 * the identity rule (email + phone; re-registering does not
 * reset it) stated in plain words, because that honesty IS the
 * conversion (WP5 quota system; prices per the standing offer
 * in the pricing catalog — Free with 5 diagnoses, Pro and Shops
 * per month).
 */
export function Pricing() {
  const { t } = useLocale();
  const p = t.pricing;

  return (
    <section id="pricing" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{p.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {p.heading}
            </h2>
          </div>
        </Reveal>

        <Reveal delay={130} className="mt-16 lg:mt-20">
          <PlanCards variant="full" />
        </Reveal>
      </div>
    </section>
  );
}
