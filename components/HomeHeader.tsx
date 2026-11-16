"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getToken } from "@/lib/client/auth";
import { LogoLockup } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Homepage header — design pass "One Screen" (2026-11-16, owner:
 * "a simple header" over one full-screen visual, Tesla restraint).
 * The homepage carries its own slim bar instead of the shared
 * marketing Header (which keeps serving /diagnose, /pricing,
 * /shops, /scan, /contact unchanged): wordmark left; the three
 * primary routes; the language + theme controls (owner hard
 * requirements, kept as compact icon controls); then the session
 * actions — signed out: Sign in + the Get started pill; signed in:
 * Open app + the Run a diagnosis pill. No banners, no tagline,
 * nothing else.
 *
 * The bar floats transparent over the hero film and settles into
 * the solid surface bar on scroll, like the shared Header's overlay
 * mode. While floating it scopes the hero's fixed dark palette
 * through the theme variables themselves (ink/accent/line tokens
 * re-pointed on this element only), so every child — lockup, nav,
 * controls — reads white-on-film in BOTH themes with no forked
 * markup; settled, the overrides lift and the active theme's
 * tokens take over untouched.
 */
const FLOATING_PALETTE = {
  "--color-ink-1": "#ffffff",
  "--color-ink-2": "rgba(255, 255, 255, 0.78)",
  "--color-ink-3": "rgba(255, 255, 255, 0.55)",
  "--color-line": "rgba(255, 255, 255, 0.18)",
  "--color-accent": "#f5a524",
  "--color-accent-bright": "#ffb63e",
  "--color-accent-ink": "#14100a",
} as CSSProperties;

export function HomeHeader() {
  const { t } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    setSignedIn(getToken() !== null);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const floating = !scrolled;

  return (
    <header
      style={floating ? FLOATING_PALETTE : undefined}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        floating ? "border-b border-transparent" : "border-b border-line bg-surface"
      }`}
    >
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t.header.logoHomeLabel}
          className="flex min-h-[48px] items-center shrink-0"
        >
          <LogoLockup wordmarkClassName="hidden min-[480px]:inline" />
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
                className="inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
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
                className="inline-flex h-12 items-center rounded-full bg-accent px-5 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
              >
                {t.header.getStarted}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
