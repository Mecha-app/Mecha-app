"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The businesses strip (copy pass round 2, 2026-11-09, owner: "cut
 * whole sections"). This was a full section — nearby shops and towing
 * columns, a list-your-business block, and a marketplace block (192
 * rendered words). The homepage now carries one line and three doors:
 * the full nearby/listing story lives on /shops, and the marketplace
 * has its own page. The catalog strings are untouched — recomposing
 * this component restores the long version.
 */
export function Businesses() {
  const { t } = useLocale();
  const b = t.businesses;

  const links = [
    { label: t.header.navShops, href: "/shops" },
    { label: b.forBusiness.cta, href: "/business/register" },
    { label: b.marketplace.cta, href: "/marketplace" },
  ];

  return (
    <section id="nearby" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div className="border-t border-line pt-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{b.eyebrow}</p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.01em] text-ink-1">
              {b.heading}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-ink-2">{b.body}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-9 gap-y-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex min-h-[48px] items-center gap-2 font-medium text-accent transition-colors duration-150 hover:text-accent-bright"
                >
                  {l.label}
                  <ArrowIcon />
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
