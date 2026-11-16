"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LogoLockup } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Site header: logo lockup, primary nav, language switcher + theme toggle
 * (both owner hard requirements), sign-in, sign-up CTA.
 *
 * `overlay` mode (homepage): the header floats transparent over the top
 * of the hero — sparse chrome — and settles into the solid surface bar
 * once the visitor scrolls. Both states use the ACTIVE theme's tokens
 * only: an earlier build re-pointed the floating state's ink tokens at
 * dark-theme values (a leftover from the full-bleed-film hero), which
 * desynced background and foreground tokens in the light theme — see
 * the theme atomicity rule in globals.css. The crosshatch band is the
 * one permitted texture (§1.6) — settled state only.
 */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const { t } = useLocale();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const floating = overlay && !scrolled;

  return (
    <header
      className={
        overlay
          ? `fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
              floating
                ? "border-b border-transparent"
                : "border-b border-line bg-surface"
            }`
          : "sticky top-0 z-40 border-b border-line bg-surface"
      }
    >
      {(!overlay || scrolled) && (
        <div className="crosshatch pointer-events-none absolute inset-0" aria-hidden="true" />
      )}
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t.header.logoHomeLabel}
          className="flex min-h-[48px] items-center shrink-0"
        >
          {/* Below sm the wordmark yields to the mark alone: at 360px the
              full lockup + 48px controls + the sign-up CTA cannot share
              one bar (design pass 2 mobile audit). The lockup is intact
              from sm up, and always in the footer. */}
          <LogoLockup wordmarkClassName="hidden min-[480px]:inline" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex" aria-label="Primary">
          {/* Primary nav targets the standalone marketing routes
              (blueprint routes 2, 4, and 5). The homepage sections
              remain the summary; these pages carry the full depth. */}
          <Link href="/diagnose" className="transition-colors duration-150 hover:text-ink-1">
            {t.header.navDiagnose}
          </Link>
          <Link href="/pricing" className="transition-colors duration-150 hover:text-ink-1">
            {t.header.navPricing}
          </Link>
          <Link href="/shops" className="transition-colors duration-150 hover:text-ink-1">
            {t.header.navShops}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle label={t.header.themeToggleLabel} />
          <Link
            href="/login"
            className="hidden min-h-[48px] items-center text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink-1 sm:inline-flex"
          >
            {t.header.signIn}
          </Link>
          <Link
            href="/register"
            className="inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
          >
            {t.header.createAccount}
          </Link>
        </div>
      </div>
    </header>
  );
}
