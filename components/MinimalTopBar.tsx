"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getToken } from "@/lib/client/auth";
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
 * The bar is deliberately only this: the Gauge M lockup, linked home
 * ("/" for these pre-sign-in surfaces; "/app" when a session exists —
 * Pass #12), with a full 48px-tall tap target. The lockup renders from the active theme's
 * tokens (text-ink-1 via LogoLockup), so it is visible in BOTH themes —
 * no forked logo variants (theme atomicity rule, globals.css).
 */
export function MinimalTopBar() {
  const { t } = useLocale();
  // Logo target (Pass #12, 2026-11-16): these are pre-sign-in
  // surfaces, so a signed-out visitor's logo targets "/" — but a
  // signed-in user who lands here (e.g. /app/complete-profile) gets
  // his main page, the dashboard /app, like every other shell.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(getToken() !== null);
  }, []);
  const logoHref = signedIn ? "/app" : "/";
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link
          href={logoHref}
          aria-label={signedIn ? t.header.logoAppLabel : t.header.logoHomeLabel}
          className="flex min-h-[48px] items-center shrink-0"
        >
          <LogoLockup />
        </Link>
      </div>
    </header>
  );
}
