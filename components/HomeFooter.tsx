"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LogoLockup } from "./Logo";

/**
 * Homepage footer — design pass "One Screen" (2026-11-16): the
 * minimal close the restrained page asks for — the wordmark, the
 * legal links, the copyright line. The full footer (tagline,
 * support column, disclaimer) keeps serving every other page
 * unchanged; the legal pages themselves carry the full text.
 *
 * The wordmark is a home link like every other logo on the site
 * (owner directive 2026-11-03, completed 2026-11-16): this footer
 * and the shared Footer were the last logo renders that were not
 * links. The target is "/" for everyone (Pass #17, 2026-11-17:
 * the main page, signed in or out — Pass #12's session-aware
 * target is reverted on the owner's word).
 */
export function HomeFooter() {
  const { t } = useLocale();
  const f = t.footer;

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            aria-label={t.header.logoHomeLabel}
            className="inline-flex"
          >
            <LogoLockup />
          </Link>
          <nav className="flex gap-8 text-sm" aria-label="Footer">
            <Link
              href="/privacy"
              className="inline-flex min-h-[48px] items-center text-ink-2 transition-colors duration-150 hover:text-ink-1"
            >
              {f.privacy}
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-[48px] items-center text-ink-2 transition-colors duration-150 hover:text-ink-1"
            >
              {f.terms}
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-[13px] text-ink-3">
          © 2026 {f.operator} {f.rights}
        </p>
      </div>
    </footer>
  );
}
