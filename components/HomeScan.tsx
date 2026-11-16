"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomeFeature } from "./HomeFeature";

/**
 * Homepage scan section — design pass #6 (2026-11-16, the
 * Audi-length pass). The diagnose loop (a driver checking a
 * warning light in the app) fills the screen; the button goes to
 * the scan landing.
 */
export function HomeScan() {
  const { t } = useLocale();

  return (
    <HomeFeature
      loop="diagnose"
      title={t.hero.scanTitle}
      line={t.hero.scanLine}
      cta={t.hero.tryScanCta}
      href="/scan"
    />
  );
}
