"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LogoLockup } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Site header: logo lockup, primary nav, language switcher + theme toggle
 * (both owner hard requirements), sign-in, waitlist CTA. The crosshatch
 * band is the one permitted texture (§1.6) — header only, ≤3% opacity.
 */
export function Header() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="crosshatch pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="MECHA — home" className="shrink-0">
          <LogoLockup />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex" aria-label="Primary">
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
            className="hidden text-sm font-medium text-ink-2 transition-colors duration-150 hover:text-ink-1 sm:inline"
          >
            {t.header.signIn}
          </Link>
          <a
            href="#waitlist"
            className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
          >
            {t.header.joinWaitlist}
          </a>
        </div>
      </div>
    </header>
  );
}
