"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Reveal } from "./Reveal";

/**
 * "Fair Price vs Their Quote" — MECHA's signature visual block
 * (DESIGN_SYSTEM §1.1, blueprint route `/` + `/app/quote-check`).
 *
 * The numbers below are an ILLUSTRATIVE EXAMPLE of the check — labeled as
 * such on the page in every locale (fairPrice.exampleLabel). They are not
 * a statistic, not a testimonial, and not a real customer's quote
 * (claims discipline, §1.6). In the product, these values come from the
 * pricing engine per vehicle (WP5); here they demonstrate the component.
 *
 * Verdict colors are product semantics only (§1.2): fair / warn / rip,
 * always shipped with a word label — never color alone.
 */

type VerdictKind = "fair" | "warn" | "rip";

interface QuoteLine {
  key: "part" | "labor" | "supplies";
  typeKey: "part" | "labor" | "fee";
  quote: number;
  fairLow: number;
  fairHigh: number;
  verdict: VerdictKind;
}

/** Example job: alternator replacement. Quote $780 vs fair $460–$600. */
const LINES: QuoteLine[] = [
  { key: "part", typeKey: "part", quote: 410, fairLow: 230, fairHigh: 290, verdict: "warn" },
  { key: "labor", typeKey: "labor", quote: 290, fairLow: 230, fairHigh: 290, verdict: "fair" },
  { key: "supplies", typeKey: "fee", quote: 80, fairLow: 0, fairHigh: 20, verdict: "rip" },
];
const TOTAL = { quote: 780, fairLow: 460, fairHigh: 600 };
const LINE_SCALE = 450; // per-line bar scale (max quote $410)
const TOTAL_SCALE = 820;

const VERDICT_CLASS: Record<VerdictKind, string> = {
  fair: "bg-verdict-fair",
  warn: "bg-verdict-warn",
  rip: "bg-verdict-rip",
};
const VERDICT_TEXT: Record<VerdictKind, string> = {
  fair: "text-verdict-fair",
  warn: "text-verdict-warn",
  rip: "text-verdict-rip",
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function RangeBar({
  quote,
  fairLow,
  fairHigh,
  scale,
  verdict,
}: {
  quote: number;
  fairLow: number;
  fairHigh: number;
  scale: number;
  verdict: VerdictKind;
}) {
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  return (
    <div className="relative h-6" aria-hidden="true">
      {/* gauge track */}
      <div className="absolute inset-y-[9px] left-0 right-0 rounded-full bg-inset" />
      {/* fair range band */}
      <div
        className={`bar-anim absolute inset-y-[9px] rounded-full ${VERDICT_CLASS[verdict]} opacity-35`}
        style={{ left: pct(fairLow), width: pct(fairHigh - fairLow) }}
      />
      {/* their quote marker */}
      <div
        className="absolute inset-y-[3px] w-[3px] rounded bg-ink-1"
        style={{ left: `calc(${pct(quote)} - 1px)` }}
      />
    </div>
  );
}

export function FairPriceQuote() {
  const { t } = useLocale();
  const f = t.fairPrice;

  return (
    <section id="fair-price" className="scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-36">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">{f.eyebrow}</p>
            <h2 className="mt-4 text-balance font-display text-[clamp(2.1rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1">
              {f.heading}
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">{f.body}</p>
          </div>
        </Reveal>

        <div className="mt-16 grid items-center gap-12 lg:mt-20 lg:grid-cols-2 lg:gap-16">
        {/* The comparison card — the signature block itself, given the stage. */}
        <Reveal>
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-medium text-ink-1">{f.jobLabel}</h3>
            <span className="rounded border border-line bg-inset px-2 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-ink-3">
              {f.exampleLabel}
            </span>
          </div>

          <div className="mt-2 flex gap-5 text-[12px] font-medium text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-3 bg-ink-1" aria-hidden="true" />
              {f.theirQuote}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[6px] w-3 rounded-full bg-ink-3 opacity-40" aria-hidden="true" />
              {f.fairRange}
            </span>
          </div>

          <div className="mt-4 divide-y divide-line">
            {LINES.map((line) => (
              <div key={line.key} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-medium text-ink-1">
                    {f.lines[line.key].name}
                    <span className="ms-2 text-[12px] font-normal text-ink-3">
                      {f.lineTypes[line.typeKey]}
                    </span>
                  </p>
                  <p className="tnum font-display text-base font-semibold text-ink-1">
                    {money(line.quote)}
                    <span className="ms-2 text-[13px] font-normal text-ink-3">
                      {f.fairRange} {money(line.fairLow)}–{money(line.fairHigh)}
                    </span>
                  </p>
                </div>
                <RangeBar
                  quote={line.quote}
                  fairLow={line.fairLow}
                  fairHigh={line.fairHigh}
                  scale={LINE_SCALE}
                  verdict={line.verdict}
                />
                <p className={`text-[13px] font-semibold ${VERDICT_TEXT[line.verdict]}`}>
                  {f.lines[line.key].verdict}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-display text-base font-semibold text-ink-1">{f.total}</p>
              <p className="tnum font-display text-[26px] font-semibold text-ink-1">
                {money(TOTAL.quote)}
                <span className="ms-2 text-sm font-normal text-ink-3">
                  {f.fairRange} {money(TOTAL.fairLow)}–{money(TOTAL.fairHigh)}
                </span>
              </p>
            </div>
            <RangeBar
              quote={TOTAL.quote}
              fairLow={TOTAL.fairLow}
              fairHigh={TOTAL.fairHigh}
              scale={TOTAL_SCALE}
              verdict="warn"
            />
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              <span className="font-semibold text-verdict-warn">{f.verdictWord}.</span>{" "}
              {f.verdictText}
            </p>
          </div>
        </div>
        </Reveal>

        {/* The fair-price film — frameless beside the card, controls kept. */}
        <Reveal delay={130}>
          <figure className="overflow-hidden rounded-2xl border border-line">
            <video
              className="aspect-video w-full bg-black"
              controls
              preload="none"
              poster="/videos/mecha-fair-price-poster.webp"
              aria-label={f.eyebrow}
            >
              <source src="/videos/mecha-fair-price-explainer.mp4" type="video/mp4" />
            </video>
          </figure>
        </Reveal>
        </div>
      </div>
    </section>
  );
}
