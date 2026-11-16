"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomeFeature } from "./HomeFeature";

/**
 * Homepage marketplace section — design pass #6 (2026-11-16, the
 * Audi-length pass). The visual is a clean car-for-sale shot
 * generated for this pass (public/images/marketplace-car.jpg) —
 * the listing look itself. The line states only what shipped:
 * listings carry the guided photo set (front, back, both sides,
 * interior) from the upload flow. The button browses the
 * marketplace.
 */
export function HomeMarketplace() {
  const { t } = useLocale();

  return (
    <HomeFeature
      image="/images/marketplace-car.jpg"
      title={t.hero.marketTitle}
      line={t.hero.marketLine}
      cta={t.hero.marketCta}
      href="/marketplace"
    />
  );
}
