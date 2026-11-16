"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomeFeature } from "./HomeFeature";

/**
 * Homepage fair-price section — design pass #6 (2026-11-16, the
 * Audi-length pass). The quote loop (a fair-price check scrolled
 * at the shop counter) fills the screen; the button lands on
 * /diagnose, where the fair-price check lives in the report.
 */
export function HomeFairPrice() {
  const { t } = useLocale();

  return (
    <HomeFeature
      loop="quote"
      title={t.hero.fairTitle}
      line={t.hero.fairLine}
      cta={t.hero.fairCta}
      href="/diagnose"
    />
  );
}
