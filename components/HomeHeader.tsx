"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getToken } from "@/lib/client/auth";
import { LogoLockup } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Homepage header — design pass #5 (2026-11-16, owner reference:
 * a bright Mechatech.io concept he picked over a second, darker
 * variant). The homepage carries its own bar instead of the shared
 * marketing Header (which keeps serving /diagnose, /pricing,
 * /shops, /scan, /contact unchanged): a clean WHITE bar — the MECHA
 * lockup (unchanged) on the left, the three primary routes centered,
 * and on the right the language + theme controls (owner hard
 * requirements, compact icons), Sign in, and ONE blue primary pill —
 * "Start Free" → /register. Signed in, the actions become Open app +
 * the Run a diagnosis pill (pass #4 behavior, restyled blue). No
 * banners, no tagline, no texture, no shadow.
 *
 * Nav (owner clarification, 2026-11-16, from his third reference —
 * "I like those three, in the header"): exactly "How It Works" —
 * an anchor to the Three Simple Steps section on this page — and
 * "Safety" → /diagnose, where the product's safety guidance
 * actually appears in results. The Diagnose / Pricing / For shops
 * links left this bar (the routes stay reachable elsewhere — shops
 * via its homepage section button); the shared Header keeps them
 * on every other page.
 *
 * The bar is light in both themes: the homepage scopes the light
 * token set on its root (app/page.tsx), so every token consumer in
 * this bar — surface, ink, line — resolves to the paper ramp
 * regardless of the stored theme. The bar itself only consumes
 * tokens and one literal: the reference's blue (#2563eb family),
 * a self-contained color on the primary pill, the same way the
 * hero's on-photo buttons carry literal colors.
 */
export function HomeHeader() {
  const { t } = useLocale();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(getToken() !== null);
  }, []);

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-line/70 bg-surface">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t.header.logoHomeLabel}
          className="flex min-h-[48px] shrink-0 items-center justify-self-start"
        >
          <LogoLockup wordmarkClassName="hidden min-[480px]:inline" />
        </Link>

        <nav
          className="hidden items-center gap-8 text-[15px] font-medium text-ink-1 md:flex"
          aria-label="Primary"
        >
          <Link href="#how-it-works" className="transition-colors duration-150 hover:text-[#2563eb]">
            {t.header.navHowItWorks}
          </Link>
          <Link href="/diagnose" className="transition-colors duration-150 hover:text-[#2563eb]">
            {t.header.navSafety}
          </Link>
        </nav>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle label={t.header.themeToggleLabel} />
          {signedIn ? (
            <>
              <Link
                href="/app"
                className="hidden min-h-[48px] items-center text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink-1 sm:inline-flex"
              >
                {t.header.openApp}
              </Link>
              <Link
                href="/app/diagnose"
                className="inline-flex h-11 items-center rounded-lg bg-[#2563eb] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
              >
                {t.hero.runCta}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden min-h-[48px] items-center text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink-1 sm:inline-flex"
              >
                {t.header.signIn}
              </Link>
              <Link
                href="/register"
                className="inline-flex h-11 items-center rounded-lg bg-[#2563eb] px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
              >
                {t.header.startFree}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
