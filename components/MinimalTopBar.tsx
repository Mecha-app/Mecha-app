"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LogoLockup } from "./Logo";

/**
 * The standard minimal top bar for the pages that carry no full shell
 * (the auth + standalone flows: /login, /register, the password pages,
 * the Google completion landing, /app/complete-profile). Owner
 * directive (2026-11-03): the logo is on EVERY page, and one click on
 * it always returns to the main page — including the pages a visitor
 * reaches before any account exists. Those pages previously rendered a
 * bare <main> with no way home but the browser's back button.
 *
 * The bar is deliberately only this: the Gauge M lockup, linked to "/"
 * (the public main page — these are pre-sign-in surfaces), with a full
 * 48px-tall tap target. The lockup renders from the active theme's
 * tokens (text-ink-1 via LogoLockup), so it is visible in BOTH themes —
 * no forked logo variants (theme atomicity rule, globals.css).
 */
export function MinimalTopBar() {
  const { t } = useLocale();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t.header.logoHomeLabel}
          className="flex min-h-[48px] items-center shrink-0"
        >
          <LogoLockup />
        </Link>
      </div>
    </header>
  );
}
