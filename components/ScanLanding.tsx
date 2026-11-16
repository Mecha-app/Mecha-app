"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";
import { FinalCta } from "./FinalCta";

/**
 * /scan landing (blueprint route 3, Scan package) — what Scan does,
 * how each of the three modes works, and the honest limits, in the
 * homepage's section language.
 *
 * This page is also the QR-sticker landing: a non-owner who scans the
 * "this car is protected by MECHA" sticker on someone else's car
 * lands here, so the sticker band explains what they just scanned and
 * the page converts curiosity into a free account.
 *
 * Copy discipline (§1.6): the product's real mechanics only — NHTSA
 * decode + recalls, photo triage with its limits stated in the open,
 * code translation through the standard diagnosis. No invented stats.
 */

function ModeBand({
  kicker,
  heading,
  body,
  steps,
  children,
}: {
  kicker: string;
  heading: string;
  body: string;
  steps: string[];
  children?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{kicker}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-ink-1">
              {heading}
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">{body}</p>
            {children}
          </Reveal>
          <Reveal delay={120}>
            <ol className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-4 rounded-2xl border border-line bg-surface px-5 py-4"
                >
                  <span className="font-mono text-sm font-semibold leading-6 text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-base leading-relaxed text-ink-1">{step}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function ScanLanding() {
  const { t } = useLocale();
  const s = t.scan.landing;

  return (
    <>
      {/* Statement band — centered at every width (the mobile alignment
          rule), with the one CTA that matters: into the scan flow. */}
      <section>
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 lg:pb-28 lg:pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
              {s.eyebrow}
            </p>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-1">
              {s.heading}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">{s.sub}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/app/scan"
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright"
              >
                {s.startCta}
              </Link>
              <Link
                href="/register"
                className="inline-flex h-[52px] items-center justify-center rounded-full border border-line px-8 font-display text-base font-semibold text-ink-1 transition-colors hover:bg-raised"
              >
                {s.registerCta}
              </Link>
            </div>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-ink-3">
              {s.accountNote}
            </p>
          </Reveal>
        </div>
      </section>

      <ModeBand kicker={s.vinKicker} heading={s.vinHeading} body={s.vinBody} steps={s.vinSteps} />
      <ModeBand
        kicker={s.photoKicker}
        heading={s.photoHeading}
        body={s.photoBody}
        steps={s.photoSteps}
      >
        <div className="mt-7 rounded-2xl border border-line bg-inset px-5 py-4">
          <p className="text-sm font-semibold text-ink-1">{s.photoHonestTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{s.photoHonestBody}</p>
        </div>
      </ModeBand>
      <ModeBand kicker={s.codeKicker} heading={s.codeHeading} body={s.codeBody} steps={s.codeSteps} />

      {/* QR-sticker band — for the person who scanned someone else's car. */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 lg:py-36">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
              {s.stickerEyebrow}
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-balance font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-ink-1">
              {s.stickerHeading}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-2">
              {s.stickerBody}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">
              {s.stickerBody2}
            </p>
            <div className="mt-9">
              <Link
                href="/register"
                className="inline-flex h-[52px] items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright"
              >
                {s.stickerCta}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Finale — the open sign-up close: sticker curiosity converts
          into a free account here, exactly like on `/`. */}
      <FinalCta />
    </>
  );
}
