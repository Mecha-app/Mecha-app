"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/**
 * Homepage / landing finale — direct sign-up (owner directive 2026-11-03:
 * NO WAITLIST anywhere; the product's front door is an open sign-up).
 * This section replaced the email waitlist capture: MECHA is open, so the
 * closing argument is the standing free offer itself — 5 diagnoses, no
 * card, the count always in plain sight — with one CTA into /register.
 * Claims discipline (§1.6): only the product's real mechanics.
 */
export function FinalCta() {
  const { t } = useLocale();
  const f = t.finalCta;

  return (
    <section className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{f.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {f.heading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">{f.body}</p>
            <div className="mt-10">
              <Link
                href="/register"
                className="inline-flex h-14 items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-[var(--color-accent-ink)] transition-colors duration-150 hover:bg-accent-bright"
              >
                {f.cta}
              </Link>
            </div>
            <p className="mt-3 text-[13px] text-ink-3">{f.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
