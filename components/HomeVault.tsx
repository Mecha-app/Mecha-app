"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomeFeature } from "./HomeFeature";

/**
 * Homepage Health Vault section — design pass #6 (2026-11-16, the
 * Audi-length pass). The roadside loop fills the screen. The line
 * states only what is live: recalls, complaints, and safety
 * ratings for the visitor's exact car, from the integrated NHTSA
 * feeds. The vault lives inside an account, so the button goes
 * to create one.
 */
export function HomeVault() {
  const { t } = useLocale();

  return (
    <HomeFeature
      loop="roadside"
      title={t.hero.vaultTitle}
      line={t.hero.vaultLine}
      cta={t.hero.vaultCta}
      href="/register"
    />
  );
}
