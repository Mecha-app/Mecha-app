"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GaugeMMark } from "./Logo";

/**
 * App chrome for the signed-in surfaces (WP6): the Gauge M, the working
 * destinations, and sign-out. The lockup is the home link (owner
 * directive 2026-11-03: logo on every page, one click back to the main
 * page) — it targets /app here, the signed-in main page.
 *
 * STRUCTURE (design-polish pass, 2026-11-03 — owner's live-test
 * screenshot showed the old wrapping bar as an unstructured sprawl on
 * his phone: items scattered mid-air, sign-out floating). The shell is
 * now app-like at every width:
 *   - a logo/header row at the top,
 *   - on mobile, the destinations as full-width stacked rows — one
 *     height (48px), hairline dividers, labels on the logo's left
 *     edge — the standard app-menu structure,
 *   - sign-out as a proper final row at the bottom, visually separated
 *     by its own rule,
 *   - on desktop (md+), the same elements settle into the single
 *     horizontal bar: logo, inline links, sign-out at the end.
 * Every target is ≥48px; every link target is unchanged.
 */
export function AppNav({
  business = false,
  logoHref = "/app",
}: {
  business?: boolean;
  /** Where the logo returns to. The app shell's main page is /app;
   *  the pre-sign-in business pages that borrow this chrome (business
   *  login/register) pass "/" — the public main page. */
  logoHref?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();

  function signOut() {
    clearSession();
    router.push("/login");
  }

  const links = business
    ? [
        { href: "/app", label: t.wp6.nav.dashboard },
        { href: "/app/messages", label: t.wp6.nav.messages },
        { href: "/app/nearby", label: t.wp6.nav.nearby },
      ]
    : [
        { href: "/app", label: t.wp6.nav.dashboard },
        { href: "/app/diagnose", label: t.wp6.nav.diagnose },
        { href: "/app/scan", label: t.wp6.nav.scan },
        { href: "/app/vault", label: t.wp6.nav.vault },
        { href: "/app/nearby", label: t.wp6.nav.nearby },
        { href: "/app/messages", label: t.wp6.nav.messages },
        { href: "/marketplace", label: t.wp6.nav.marketplace },
      ];

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-5xl px-4 md:flex md:items-center md:gap-x-2 md:py-2">
        {/* Logo row — stands alone at the top on mobile, leads the bar
            on desktop. */}
        <div className="flex items-center py-2 md:py-0">
          <Link
            href={logoHref}
            className="flex h-12 items-center gap-2 pe-2"
            aria-label={logoHref === "/app" ? t.header.logoAppLabel : t.header.logoHomeLabel}
          >
            <GaugeMMark size={28} className="text-ink-1" />
            <span className="font-display text-lg font-bold tracking-[0.04em] text-ink-1">MECHA</span>
          </Link>
        </div>

        {/* Destinations — stacked divided rows on mobile, the inline
            bar on desktop. */}
        <nav
          className="flex flex-col divide-y divide-line border-t border-line md:flex-1 md:flex-row md:flex-wrap md:items-center md:divide-y-0 md:border-t-0"
          aria-label="App"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex h-12 items-center px-0 text-base font-medium text-ink-2 hover:text-ink-1 md:px-3"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Sign out — the separated final row on mobile, the end of
            the bar on desktop. */}
        <div className="border-t border-line md:border-t-0">
          <button
            type="button"
            onClick={signOut}
            className="flex h-12 w-full items-center px-0 text-base font-medium text-ink-2 hover:text-ink-1 md:w-auto md:px-3"
          >
            {t.wp6.nav.signOut}
          </button>
        </div>
      </div>
    </header>
  );
}
