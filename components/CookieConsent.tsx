"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  onCookieSettingsOpen,
  readConsentChoice,
  writeConsentChoice,
} from "@/lib/client/consent";
import type { ConsentChoice } from "@/lib/consent";

/**
 * Cookie consent bar (cookie-consent pass, 2026-11-19, owner spec:
 * the slim professional bar the big-brand sites show — NOT a card
 * or a modal). One short line, the privacy link, and the two
 * choices on a single slim bar fixed to the bottom of the viewport:
 * Accept solid, Decline quiet. Compact, calm, MECHA palette; it
 * floats above the page edge with the safe-area inset respected and
 * never blocks the page's own calls to action beyond its one slim
 * strip.
 *
 * Behavior: renders nothing until the client knows the stored
 * choice (no flash, no hydration mismatch); shows only when no
 * choice is stored, or when the footer's "Cookie settings" link
 * asks it to re-open. Choosing stores the answer (lib/client/
 * consent), which is also what unlocks analytics — Accept loads
 * GA/Clarity in place via AnalyticsGate; Decline keeps them off.
 */
export function CookieConsent() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (readConsentChoice() === null) setVisible(true);
    return onCookieSettingsOpen(() => setVisible(true));
  }, []);

  if (!visible) return null;

  const choose = (choice: ConsentChoice) => {
    writeConsentChoice(choice);
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      role="region"
      aria-label={t.consent.label}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-[0_8px_30px_rgba(15,42,80,0.14)] backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <p className="flex-1 text-sm leading-snug text-ink-2">
          {t.consent.message}{" "}
          <Link
            href="/privacy"
            className="font-medium whitespace-nowrap text-accent-deep underline-offset-4 transition-colors duration-150 hover:underline"
          >
            {t.footer.privacy}
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-inset hover:text-ink-1"
          >
            {t.consent.decline}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-bright"
          >
            {t.consent.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
