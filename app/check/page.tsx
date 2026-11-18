"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { compatForVehicle, type CompatFeatureKey } from "@/lib/server/compat";

/**
 * /check — the compatibility checker (Pass #20, the Carly lesson):
 * a visitor names their car and sees exactly which MECHA features
 * apply to it, with the honest basis for each — before anyone asks
 * them to sign up. The verdicts come from lib/server/compat (the
 * product's real coverage rules); this page only renders them.
 */
export default function CheckPage() {
  const { t } = useLocale();
  const c = t.compat;
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<{ car: string; year: number } | null>(null);

  const basis: Record<CompatFeatureKey, string> = {
    diagnosis: c.features.diagnosisBasis,
    photoScan: c.features.photoScanBasis,
    vinData: result && result.year >= 1996 ? c.features.vinDataBasisYes : c.features.vinDataBasisNo,
    fairPrice: c.features.fairPriceBasis,
  };
  const labels: Record<CompatFeatureKey, string> = {
    diagnosis: c.features.diagnosis,
    photoScan: c.features.photoScan,
    vinData: c.features.vinData,
    fairPrice: c.features.fairPrice,
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const y = Number(year);
    if (!Number.isFinite(y) || y < 1950 || y > 2100 || !make.trim() || !model.trim()) return;
    setResult({ car: `${y} ${make.trim()} ${model.trim()}`, year: y });
  }

  const features = result ? compatForVehicle({ year: result.year }).features : [];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{c.eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {c.heading}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">{c.sub}</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="chk-year" className="block text-sm font-medium text-ink-2">
                {c.yearLabel}
              </label>
              <input
                id="chk-year"
                inputMode="numeric"
                placeholder="2019"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
                required
              />
            </div>
            <div>
              <label htmlFor="chk-make" className="block text-sm font-medium text-ink-2">
                {c.makeLabel}
              </label>
              <input
                id="chk-make"
                placeholder="Honda"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
                required
              />
            </div>
            <div>
              <label htmlFor="chk-model" className="block text-sm font-medium text-ink-2">
                {c.modelLabel}
              </label>
              <input
                id="chk-model"
                placeholder="Accord"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="h-12 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            {c.checkButton}
          </button>
        </form>

        {result && (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6" aria-live="polite">
            <h2 className="font-display text-xl font-semibold text-ink-1">
              {c.resultHeading.replace("{car}", result.car)}
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {features.map((feature) => (
                <li key={feature.key} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                  <p className="flex items-center justify-between gap-3 text-base text-ink-1">
                    <span className="font-medium">{labels[feature.key]}</span>
                    <span
                      className={
                        "shrink-0 rounded-full px-3 py-1 text-sm font-semibold " +
                        (feature.applies ? "text-verdict-fair" : "text-verdict-rip")
                      }
                    >
                      {feature.applies ? c.applies : c.notApplies}
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{basis[feature.key]}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/scan"
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              {c.cta}
            </Link>
            <p className="mt-3 text-center text-sm text-ink-3">{c.note}</p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
