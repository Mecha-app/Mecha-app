"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * The homepage's closing band — design pass #5 (2026-11-16),
 * borrowed from the owner's SECOND reference at his direction:
 * a full-width blue band directly above the footer — "Start with
 * 5 free diagnoses" and ONE white button. The claim is true
 * (verified in production: a new account shows 5 of 5 free
 * diagnoses).
 *
 * The button goes to CREATE ACCOUNT — "Try MECHA free" →
 * /register (owner clarification, 2026-11-16): the 5 free
 * diagnoses live inside an account, so signup is the path;
 * payment only enters later, at a Pro upgrade. It deliberately
 * does NOT point at the diagnosis (the account gate would bounce
 * a signed-out visitor anyway) or at any pay page. The blue is a
 * self-contained literal (#2563eb family), like the rest of this
 * page's primary actions.
 */
export function HomeCta() {
  const { t } = useLocale();

  return (
    <section className="bg-[#2563eb]">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.01em] text-white">
          {t.hero.bandTitle}
        </h2>
        <Link
          href="/register"
          className="mt-8 inline-flex h-[52px] items-center rounded-lg bg-white px-8 font-display text-base font-semibold text-[#1d4ed8] transition-colors duration-150 hover:bg-white/90"
        >
          {t.hero.bandCta}
        </Link>
      </div>
    </section>
  );
}
