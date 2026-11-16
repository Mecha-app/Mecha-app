"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomeFeature } from "./HomeFeature";

/**
 * Homepage diagnosis section — design pass #6 (2026-11-16, the
 * Audi-length pass). The mechanic loop (the diagnosis shown to a
 * mechanic — the answer, in hand) fills the screen; the headline
 * is reference #1's own line, which the owner picked on sight.
 * The button is the hero primary itself: same label, same
 * /app/diagnose destination, same account-first return-to.
 */
export function HomeDiagnosis() {
  const { t } = useLocale();

  return (
    <HomeFeature
      loop="mechanic"
      title={t.hero.diagTitle}
      line={t.hero.diagLine}
      cta={t.hero.startFreeCta}
      href="/app/diagnose"
      gate
    />
  );
}
