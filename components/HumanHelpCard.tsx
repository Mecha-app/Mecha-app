"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * The human-help route (pass #19, 2026-11-17, owner order) — the
 * card shown when a result should not end with the AI: either the
 * symptom could be URGENT (a critical severity, a car that must
 * not be driven) or the AI could not confidently narrow it down.
 *
 * The route it offers is the one the product has today: shops
 * near you. Inside the app that is /app/nearby; for a visitor it
 * is a free account first (the nearby search lives in the app),
 * and the card says so. MECHA has NO mechanic hotline and no
 * phone number is shown or implied — the help is a real shop,
 * in person.
 */
export function HumanHelpCard({
  variant,
  audience,
}: {
  variant: "urgent" | "unsure";
  audience: "public" | "app";
}) {
  const { t } = useLocale();
  const h = t.help;
  const urgent = variant === "urgent";

  return (
    <div
      className={
        "rounded-2xl bg-surface px-5 py-5 " +
        (urgent ? "border-2 border-verdict-rip" : "border border-line")
      }
      role={urgent ? "alert" : undefined}
    >
      <p
        className={
          "font-display text-lg font-semibold " + (urgent ? "text-verdict-rip" : "text-ink-1")
        }
      >
        {urgent ? h.urgentTitle : h.unsureTitle}
      </p>
      <p className="mt-1.5 leading-relaxed text-ink-2">{urgent ? h.urgentBody : h.unsureBody}</p>
      <Link
        href={audience === "app" ? "/app/nearby" : "/register"}
        className="mt-4 inline-flex h-12 items-center rounded-full bg-accent px-6 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright"
      >
        {h.ctaShops}
      </Link>
      {audience === "public" ? (
        <p className="mt-2.5 text-sm text-ink-3">{h.accountNote}</p>
      ) : null}
    </div>
  );
}
