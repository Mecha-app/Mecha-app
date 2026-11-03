"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LogoLockup } from "./Logo";

/**
 * Footer — legal/contact lines carried from the CURRENT live site
 * (SITE_AUDIT_2026-11-02 §4): operator "MECHA Technologies, Inc.",
 * support@mechaai.com (site content, mechaai.com domain), privacy/legal
 * contacts, and the AI-diagnostic disclaimer from the current Terms.
 * Entity/jurisdiction confirmation is a WP6 open item via Edison.
 */
export function Footer() {
  const { t } = useLocale();
  const f = t.footer;

  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <LogoLockup />
            <p className="mt-4 text-sm leading-relaxed text-ink-2">{f.tagline}</p>
          </div>

          <nav className="flex gap-16 text-sm" aria-label="Footer">
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
                {f.support}
              </span>
              <a href="mailto:support@mechaai.com" className="text-ink-2 transition-colors duration-150 hover:text-ink-1">
                support@mechaai.com
              </a>
              <Link href="/contact" className="text-ink-2 transition-colors duration-150 hover:text-ink-1">
                {f.contact}
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
                {f.privacy} / {f.terms}
              </span>
              <Link href="/privacy" className="text-ink-2 transition-colors duration-150 hover:text-ink-1">
                {f.privacy}
              </Link>
              <Link href="/terms" className="text-ink-2 transition-colors duration-150 hover:text-ink-1">
                {f.terms}
              </Link>
            </div>
          </nav>
        </div>

        <div className="mt-14 border-t border-line pt-7">
          <p className="text-[13px] leading-relaxed text-ink-3">{f.disclaimer}</p>
          <p className="mt-3 text-[13px] text-ink-3">
            © 2026 {f.operator} {f.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
