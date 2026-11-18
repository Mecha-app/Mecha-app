"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HumanHelpCard } from "./HumanHelpCard";
import { UncertaintyExample } from "./UncertaintyExample";

/**
 * The guided demo (pass #19, 2026-11-17, owner order): a visitor
 * walks a SAMPLE diagnosis and a SAMPLE quote check, step by
 * step, BEFORE creating an account.
 *
 * HARD CONSTRAINTS, structural:
 * - CANNED CONTENT ONLY. Every word and number below is sample
 *   data rendered from the catalog and the constants in this
 *   file. The component makes NO network calls of any kind —
 *   nothing here runs a real diagnosis, and the standing rule
 *   (a real diagnosis requires an account) is untouched. The
 *   flow is labeled a sample on every step.
 * - The sample diagnosis is REAL: the five warning lights and
 *   severities are the verified result of MECHA's own dashboard
 *   photo test (2026-11-16, the owner's live test — traction
 *   control minor; battery/charging and oil pressure critical;
 *   check engine and fuel pump moderate). The meanings are the
 *   plain-language explanations of those lights. Nothing is
 *   invented to make the demo look better.
 * - The sample quote check reuses the fair-price example's own
 *   numbers (alternator, $780 quoted against a $460–$600 range),
 *   already labeled illustrative wherever that example appears.
 *
 * Steps: 1 the scan reading (+ the urgent human-help card the
 * critical lights call for), 2 the quote check in the safer
 * verdict vocabulary, 3 the low-confidence example, 4 the door
 * into a real account.
 */

type SevKind = "critical" | "moderate" | "minor";

const SEV_TEXT: Record<SevKind, string> = {
  critical: "text-verdict-rip",
  moderate: "text-verdict-warn",
  minor: "text-verdict-fair",
};

type VerdictKind = "fair" | "warn" | "rip";

const VERDICT_TEXT: Record<VerdictKind, string> = {
  fair: "text-verdict-fair",
  warn: "text-verdict-warn",
  rip: "text-verdict-rip",
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function GuidedDemo() {
  const { t } = useLocale();
  const d = t.demo;
  const f = t.fairPrice;
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);

  const sevLabel: Record<SevKind, string> = {
    critical: d.sevCritical,
    moderate: d.sevModerate,
    minor: d.sevMinor,
  };

  const lights: { name: string; sev: SevKind; meaning: string }[] = [
    { name: d.light1Name, sev: "minor", meaning: d.light1Meaning },
    { name: d.light2Name, sev: "critical", meaning: d.light2Meaning },
    { name: d.light3Name, sev: "critical", meaning: d.light3Meaning },
    { name: d.light4Name, sev: "moderate", meaning: d.light4Meaning },
    { name: d.light5Name, sev: "moderate", meaning: d.light5Meaning },
  ];

  const quoteLines: {
    name: string;
    quote: number;
    fairLow: number;
    fairHigh: number;
    verdict: VerdictKind;
    verdictWord: string;
  }[] = [
    { name: f.lines.part.name, quote: 410, fairLow: 230, fairHigh: 290, verdict: "warn", verdictWord: f.lines.part.verdict },
    { name: f.lines.labor.name, quote: 290, fairLow: 230, fairHigh: 290, verdict: "fair", verdictWord: f.lines.labor.verdict },
    { name: f.lines.supplies.name, quote: 80, fairLow: 0, fairHigh: 20, verdict: "rip", verdictWord: f.lines.supplies.verdict },
  ];

  const stepTitles = [d.step1Title, d.step2Title, d.step3Title, d.step4Title];
  const lastStep = stepTitles.length - 1;

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <span className="rounded border border-line bg-inset px-2 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-ink-3">
          {d.sampleLabel}
        </span>
        <h1 className="mt-5 text-balance font-display text-[clamp(2.4rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-ink-1">
          {d.title}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
          {d.sampleNote}
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-9 inline-flex h-[52px] items-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright"
        >
          {d.startCta}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress — the step title, the count, and the dots. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold text-ink-1">{stepTitles[step]}</p>
        <div className="flex items-center gap-3">
          <span className="rounded border border-line bg-inset px-2 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-ink-3">
            {d.sampleLabel}
          </span>
          <span className="tnum text-sm text-ink-3" aria-live="polite">
            {step + 1} / {stepTitles.length}
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {stepTitles.map((title, i) => (
          <span
            key={title}
            className={"h-1.5 flex-1 rounded-full " + (i <= step ? "bg-accent" : "bg-inset")}
          />
        ))}
      </div>

      <div className="mt-8">
        {step === 0 && (
          <div>
            <p className="leading-relaxed text-ink-2">{d.step1Intro}</p>
            {/* The severity headline (Pass #20, the FIXD lesson): a
                real result LEADS with the safe-to-drive verdict, and
                the sample shows the same treatment — two critical
                lights mean this reading's headline is the stop band. */}
            <div className="mt-5 border-l-4 border-verdict-rip pl-4">
              <h2 className="font-display text-2xl font-semibold text-verdict-rip">
                {d.step1Headline}
              </h2>
              <p className="mt-1 leading-relaxed text-ink-2">{d.step1HeadlineDetail}</p>
            </div>
            <ul className="mt-5 flex flex-col gap-3">
              {lights.map((light) => (
                <li
                  key={light.name}
                  className="rounded-2xl border border-line bg-surface px-5 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-ink-1">{light.name}</h3>
                    <span className={"text-sm font-semibold " + SEV_TEXT[light.sev]}>
                      {sevLabel[light.sev]}
                    </span>
                  </div>
                  <p className="mt-1.5 leading-relaxed text-ink-2">{light.meaning}</p>
                </li>
              ))}
            </ul>
            {/* Two of the five lights are critical — the sample
                itself calls for the human route, so the demo
                shows it exactly where the product would. */}
            <div className="mt-6">
              <HumanHelpCard variant="urgent" audience="public" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="leading-relaxed text-ink-2">{d.step2Intro}</p>
            <div className="mt-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <h3 className="font-display text-xl font-medium text-ink-1">{f.jobLabel}</h3>
              <div className="mt-2 divide-y divide-line">
                {quoteLines.map((line) => (
                  <div key={line.name} className="py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-ink-1">{line.name}</p>
                      <p className="tnum font-display text-base font-semibold text-ink-1">
                        {money(line.quote)}
                        <span className="ms-2 text-[13px] font-normal text-ink-3">
                          {f.fairRange} {money(line.fairLow)}–{money(line.fairHigh)}
                        </span>
                      </p>
                    </div>
                    <p className={"mt-1 text-[13px] font-semibold " + VERDICT_TEXT[line.verdict]}>
                      {line.verdictWord}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-display text-base font-semibold text-ink-1">{f.total}</p>
                  <p className="tnum font-display text-[26px] font-semibold text-ink-1">
                    {money(780)}
                    <span className="ms-2 text-sm font-normal text-ink-3">
                      {f.fairRange} {money(460)}–{money(600)}
                    </span>
                  </p>
                </div>
                <p className="mt-1 text-sm font-semibold text-verdict-warn">{f.verdictWord}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.verdictText}</p>
              </div>
            </div>
            {/* "What to tell the shop" (Pass #20, the AIMECH lesson):
                the sample quote check closes with the exact words
                for this quote — the same named block a real result
                ends with, in the safer range vocabulary. */}
            <div className="mt-5 rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-display text-lg font-semibold text-ink-1">
                {d.step2ScriptTitle}
              </h3>
              <p className="mt-2 leading-relaxed text-ink-1">{d.step2Script}</p>
            </div>
            <Link
              href="/diagnose#how-estimates"
              className="mt-5 inline-flex min-h-12 items-center font-medium text-accent transition-colors hover:text-accent-bright"
            >
              {d.step2How} →
            </Link>
          </div>
        )}

        {step === 2 && <UncertaintyExample bare audience="public" />}

        {step === 3 && (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center sm:p-10">
            <p className="mx-auto max-w-xl text-[17px] leading-relaxed text-ink-1">{d.step4Body}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-accent px-8 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright sm:w-auto"
              >
                {d.step4Cta}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border border-line px-8 font-display text-base font-semibold text-ink-1 transition-colors hover:bg-raised sm:w-auto"
              >
                {d.step4Secondary}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Step navigation. */}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex h-12 items-center rounded-full border border-line px-6 font-display text-base font-semibold text-ink-1 transition-colors hover:bg-raised disabled:opacity-40"
        >
          {d.backCta}
        </button>
        {step < lastStep ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(lastStep, s + 1))}
            className="inline-flex h-12 items-center rounded-full bg-accent px-6 font-display text-base font-semibold text-accent-ink transition-colors hover:bg-accent-bright"
          >
            {d.nextCta}
          </button>
        ) : null}
      </div>
    </div>
  );
}
