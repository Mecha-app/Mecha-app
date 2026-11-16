"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Businesses } from "./Businesses";
import { DiagnosisExample } from "./DiagnosisExample";
import { HowItWorks } from "./HowItWorks";
import { Pricing } from "./Pricing";
import { Reveal } from "./Reveal";

/**
 * Standalone marketing routes (blueprint §2.1, routes 2, 4, and 5).
 *
 * These pages expand the homepage sections instead of forcing visitors
 * to infer the whole product from anchors. They reuse the audited
 * HowItWorks, DiagnosisExample, Pricing, and Businesses components so
 * the product story stays identical wherever it is told, then add the
 * route-specific depth each audience needs. Claims remain limited to
 * implemented behavior and the standing prices; no response-time,
 * demand, savings, or outcome figures are invented.
 */

type Qa = { q: string; a: string };

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-45"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SectionHeader({
  eyebrow,
  heading,
  body,
}: {
  eyebrow: string;
  heading: string;
  body?: string;
}) {
  return (
    <Reveal>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{eyebrow}</p>
        <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
          {heading}
        </h2>
        {body ? <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{body}</p> : null}
      </div>
    </Reveal>
  );
}

function PageHero({
  eyebrow,
  heading,
  body,
  children,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 lg:pb-28 lg:pt-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{eyebrow}</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-1">
            {heading}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">{body}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {children}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright sm:w-auto"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-line px-8 font-display text-base font-semibold text-ink-1 transition-colors hover:bg-raised sm:w-auto"
    >
      {children}
    </Link>
  );
}

function BulletList({ points }: { points: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {points.map((point) => (
        <li key={point} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-2">
          <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function RouteFaq({ eyebrow, heading, items }: { eyebrow: string; heading: string; items: Qa[] }) {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <SectionHeader eyebrow={eyebrow} heading={heading} />
        <Reveal>
          <div className="mx-auto mt-14 max-w-3xl border-b border-line">
            {items.map((item) => (
              <details key={item.q} className="group border-t border-line">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg font-medium text-ink-1 [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <PlusIcon />
                </summary>
                <p className="pb-6 pe-2 leading-relaxed text-ink-2 sm:pe-8">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta({
  eyebrow,
  heading,
  body,
  children,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 lg:py-36">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{eyebrow}</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
            {heading}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">{body}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {children}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function DiagnosePageContent() {
  const { t } = useLocale();
  const d = t.diagnosePage;

  const modes = [
    { ...d.modes.describe, href: "/app/diagnose" },
    { ...d.modes.photo, href: "/app/scan" },
    { ...d.modes.scan, href: "/scan" },
  ];
  const reportItems = [
    d.report.items.explanation,
    d.report.items.causes,
    d.report.items.severity,
    d.report.items.cost,
    d.report.items.labor,
    d.report.items.steps,
    d.report.items.tip,
    d.report.items.saved,
  ];
  const severityItems = [d.severity.drive, d.severity.careful, d.severity.stop];

  return (
    <>
      <PageHero eyebrow={d.eyebrow} heading={d.heading} body={d.sub}>
        <PrimaryLink href="/app/diagnose">{d.primaryCta}</PrimaryLink>
        <SecondaryLink href="/scan">{d.scanCta}</SecondaryLink>
      </PageHero>
      <p className="mx-auto -mt-10 max-w-2xl px-4 pb-16 text-center text-sm leading-relaxed text-ink-3 sm:px-6">
        {d.accountNote}
      </p>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <SectionHeader eyebrow={d.modes.eyebrow} heading={d.modes.heading} body={d.modes.body} />
          <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-10">
            {modes.map((mode, i) => (
              <Reveal key={mode.title} delay={i * 100} className="h-full">
                <article className="flex h-full flex-col border-t border-line pt-8">
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
                    {mode.kicker}
                  </p>
                  <h3 className="mt-4 font-display text-2xl font-medium leading-tight text-ink-1">
                    {mode.title}
                  </h3>
                  <p className="mt-4 leading-relaxed text-ink-2">{mode.body}</p>
                  <p className="mt-4 leading-relaxed text-ink-2">{mode.detail}</p>
                  <BulletList points={[mode.point1, mode.point2, mode.point3]} />
                  <Link
                    href={mode.href}
                    className="mt-7 inline-flex min-h-12 items-center font-medium text-accent transition-colors hover:text-accent-bright"
                  >
                    {mode.cta}
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <SectionHeader eyebrow={d.report.eyebrow} heading={d.report.heading} body={d.report.body} />
          <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {reportItems.map((item, i) => (
              <Reveal key={item.title} delay={(i % 4) * 80}>
                <article className="border-t border-line pt-7">
                  <span className="tnum font-display text-sm font-semibold tracking-[0.22em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-medium leading-snug text-ink-1">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <DiagnosisExample />

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <SectionHeader
            eyebrow={d.severity.eyebrow}
            heading={d.severity.heading}
            body={d.severity.body}
          />
          <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-10">
            {severityItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <article className="border-t border-line pt-8">
                  <h3 className="font-display text-2xl font-medium text-ink-1">{item.title}</h3>
                  <p className="mt-4 leading-relaxed text-ink-2">{item.body}</p>
                  <p className="mt-4 leading-relaxed text-ink-2">{item.detail}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mx-auto mt-20 grid max-w-5xl gap-12 border-t border-line pt-12 md:grid-cols-2">
            <article>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
                {d.speed.eyebrow}
              </p>
              <h3 className="mt-4 font-display text-2xl font-medium text-ink-1">{d.speed.heading}</h3>
              <p className="mt-4 leading-relaxed text-ink-2">{d.speed.body}</p>
              <p className="mt-4 leading-relaxed text-ink-2">{d.speed.detail}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink-3">{d.speed.note}</p>
            </article>
            <article>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
                {t.pricing.eyebrow}
              </p>
              <h3 className="mt-4 font-display text-2xl font-medium text-ink-1">{d.meter.title}</h3>
              <p className="mt-4 leading-relaxed text-ink-2">{d.meter.body}</p>
            </article>
          </div>
        </div>
      </section>

      <FinalCta eyebrow={d.final.eyebrow} heading={d.final.heading} body={d.final.body}>
        <PrimaryLink href="/register">{d.final.cta}</PrimaryLink>
        <SecondaryLink href="/app/diagnose">{d.final.secondaryCta}</SecondaryLink>
      </FinalCta>
    </>
  );
}

export function PricingPageContent() {
  const { t } = useLocale();
  const p = t.pricingPage;
  const decisions = [p.decision.free, p.decision.pro, p.decision.shops];
  const faqItems = [
    p.faq.items.card,
    p.faq.items.cancel,
    p.faq.items.payments,
    p.faq.items.freeEnd,
    p.faq.items.early,
    p.faq.items.business,
  ];

  return (
    <>
      <PageHero eyebrow={p.eyebrow} heading={p.heading} body={p.sub}>
        <PrimaryLink href="/register">{t.pricing.free.cta}</PrimaryLink>
        <SecondaryLink href="/business/register">{t.pricing.shops.cta}</SecondaryLink>
      </PageHero>

      <Pricing />

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <SectionHeader
            eyebrow={p.decision.eyebrow}
            heading={p.decision.heading}
            body={p.decision.body}
          />
          <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-10">
            {decisions.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <article className="border-t border-line pt-8">
                  <h3 className="font-display text-2xl font-medium text-ink-1">{item.title}</h3>
                  <p className="mt-4 leading-relaxed text-ink-2">{item.body}</p>
                  <p className="mt-4 leading-relaxed text-ink-2">{item.detail}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
                {p.billing.eyebrow}
              </p>
              <h2 className="mt-4 text-balance font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-1">
                {p.billing.heading}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{p.billing.body}</p>
            </Reveal>
            <Reveal delay={120}>
              <BulletList
                points={[p.billing.point1, p.billing.point2, p.billing.point3, p.billing.point4]}
              />
              <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-ink-3">
                {p.billing.note}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <RouteFaq eyebrow={p.faq.eyebrow} heading={p.faq.heading} items={faqItems} />

      <FinalCta eyebrow={p.final.eyebrow} heading={p.final.heading} body={p.final.body}>
        <PrimaryLink href="/register">{p.final.cta}</PrimaryLink>
        <SecondaryLink href="/business/register">{p.final.businessCta}</SecondaryLink>
      </FinalCta>
    </>
  );
}

export function ShopsPageContent() {
  const { t } = useLocale();
  const s = t.shopsPage;
  const listingItems = [s.listing.profile, s.listing.serviceArea, s.listing.presentation, s.listing.control];
  const faqItems = [
    s.faq.items.eligibility,
    s.faq.items.guarantee,
    s.faq.items.prepared,
    s.faq.items.cost,
    s.faq.items.cancel,
    s.faq.items.parts,
  ];

  return (
    <>
      <PageHero eyebrow={s.eyebrow} heading={s.heading} body={s.sub}>
        <PrimaryLink href="/business/register">{s.primaryCta}</PrimaryLink>
        <SecondaryLink href="/app/nearby">{s.nearbyCta}</SecondaryLink>
      </PageHero>

      <Businesses />

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <SectionHeader eyebrow={s.listing.eyebrow} heading={s.listing.heading} body={s.listing.body} />
          <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {listingItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <article className="border-t border-line pt-7">
                  <span className="tnum font-display text-sm font-semibold tracking-[0.22em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-display text-xl font-medium leading-snug text-ink-1">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{s.plan.eyebrow}</p>
              <h2 className="mt-4 text-balance font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-1">
                {s.plan.heading}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{s.plan.body}</p>
              <p className="mt-8">
                <span className="tnum font-display text-5xl font-semibold text-ink-1">$149</span>
                <span className="mt-1 block text-sm text-ink-3">{s.plan.priceLabel}</span>
              </p>
              <Link
                href="/business/register"
                className="mt-8 inline-flex min-h-12 items-center font-medium text-accent transition-colors hover:text-accent-bright"
              >
                {s.plan.cta}
              </Link>
            </Reveal>
            <Reveal delay={120}>
              <BulletList points={[s.plan.point1, s.plan.point2, s.plan.point3, s.plan.point4]} />
              <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-ink-3">
                {s.plan.note}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{s.parts.eyebrow}</p>
              <h2 className="mt-4 text-balance font-display text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink-1">
                {s.parts.heading}
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{s.parts.body}</p>
            </Reveal>
            <Reveal delay={120}>
              <BulletList points={[s.parts.point1, s.parts.point2, s.parts.point3]} />
              <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-ink-3">
                {s.parts.disclosure}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <RouteFaq eyebrow={s.faq.eyebrow} heading={s.faq.heading} items={faqItems} />

      <FinalCta eyebrow={s.final.eyebrow} heading={s.final.heading} body={s.final.body}>
        <PrimaryLink href="/business/register">{s.final.cta}</PrimaryLink>
        <SecondaryLink href="/pricing">{s.final.pricingCta}</SecondaryLink>
      </FinalCta>
    </>
  );
}
