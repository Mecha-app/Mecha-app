"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Homepage demo entry (pass #19, 2026-11-17, owner order: a
 * guided demo visitors can explore BEFORE creating an account,
 * placed prominently under the hero). One headline, one line,
 * one button — the homepage restraint — pointing at /demo,
 * where the step-through lives. The demo itself is canned
 * sample content (see GuidedDemo); this section only opens
 * the door.
 */
export function HomeDemo() {
  const { t } = useLocale();
  const d = t.demo;

  return (
    <section className="bg-bg">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{d.eyebrow}</p>
        <h2 className="mt-4 text-balance font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
          {d.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-ink-2">{d.sampleNote}</p>
        <Link
          href="/demo"
          className="mt-8 inline-flex h-[52px] items-center rounded-lg bg-[#2563eb] px-8 font-display text-base font-semibold text-white transition-colors duration-150 hover:bg-[#1d4ed8]"
        >
          {d.startCta}
        </Link>
      </div>
    </section>
  );
}
