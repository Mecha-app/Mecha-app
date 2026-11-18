import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FAULT_CODE_PAGES, POPULAR_MODELS } from "@/lib/server/faultCodes";
import { faultCodeInfo } from "@/lib/server/scan";

export const metadata: Metadata = {
  title: "Fault code meanings — MECHA",
  description:
    "What the most common check-engine codes actually mean, in plain language: the standard definition, the usual causes, and whether it's safe to keep driving.",
};

/**
 * /codes — the fault-code reference index (Pass #20, SEO engine).
 * Every entry is a full reference page built from the curated SAE
 * generic dataset (lib/server/faultCodes). Any other code a reader
 * types into MECHA's scan is still translated — structurally, by
 * the product's own code logic — and then read properly by a full
 * diagnosis on the car.
 */
export default function CodesIndexPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
          Fault code reference
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          What your check-engine code means
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">
          The most common codes, in plain language — the standard definition, the usual causes,
          and whether it&apos;s safe to keep driving. Got a different code? MECHA&apos;s free scan
          translates any code, and a diagnosis reads it against your exact car.
        </p>

        <ul className="mt-8 flex flex-col gap-2">
          {FAULT_CODE_PAGES.map((entry) => {
            const info = faultCodeInfo(entry.code);
            return (
              <li key={entry.code}>
                <Link
                  href={`/codes/${entry.code}`}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1"
                >
                  <span className="font-mono font-semibold">{entry.code}</span>
                  <span className="text-ink-2">{entry.title}</span>
                  <span className="ms-auto hidden shrink-0 text-sm text-ink-3 sm:block">
                    {info.system}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-12 font-display text-2xl font-semibold text-ink-1">
          Common problems by car
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink-2">
          What owners actually report to NHTSA about popular models — the real complaint record,
          not a listicle.
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {POPULAR_MODELS.map((model) => (
            <li key={model.slug}>
              <Link
                href={`/cars/${model.slug}/common-problems`}
                className="flex min-h-12 w-full items-center rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1"
              >
                {model.year} {model.make} {model.model} — common problems
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/scan"
          className="mt-10 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
        >
          Translate your code free
        </Link>
      </main>
      <Footer />
    </>
  );
}
