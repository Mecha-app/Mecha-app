"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Homepage comparison section — design pass #18 (2026-11-17,
 * owner, pointing at kuttsy.com's comparison page: "just
 * comparing MECHA, how efficient it is compared to other
 * platforms that provide similar services — something nice").
 * The reference's whole treatment, in MECHA's own light
 * blue/white tokens (pass #7 — never the reference's palette):
 * ONE big headline, then a two-column comparison — MECHA in a
 * white surface card on the left, "Other apps" muted on the
 * inset well on the right — over exactly FOUR short rows, each
 * cell two to four words, nothing else competing. Row labels
 * sit outside the cards, as in the reference.
 *
 * Every MECHA claim is a feature the site has today: the AI
 * diagnosis answers in seconds, the fair-price check runs
 * before a repair is approved, a dashboard photo is scanned
 * for its warning lights, and every diagnosis is saved to the
 * car's Health Vault. The "Other apps" column stays generic —
 * no competitor is named and no competitor price or statistic
 * is claimed. All copy lives in the hero catalog (all 13
 * locales), like the other homepage sections.
 *
 * Icons follow the codebase's own icon pattern (HomeSteps):
 * hand-drawn 24×24 stroke geometry at 1.75px in the homepage
 * blue, one per row, in the MECHA column only — the muted
 * column stays bare, as in the reference.
 */
const ICON_PROPS = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "#2563eb",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function SpeedIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M9 2h6" />
      <path d="M12 2v3" />
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9.5V13l2.5 2" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6 2.5h12V21l-2-1.4-2 1.4-2-1.4L10 21l-2-1.4L6 21z" />
      <path d="M9.5 8h5" />
      <path d="M9.5 12h5" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8.5 7 10 4h4l1.5 3" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3L10 7h8.5A2.5 2.5 0 0 1 21 9.5V18a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18z" />
    </svg>
  );
}

export function HomeCompare() {
  const { t } = useLocale();

  const rows = [
    {
      Icon: SpeedIcon,
      label: t.hero.compareAnswersLabel,
      mecha: t.hero.compareAnswersMecha,
      other: t.hero.compareAnswersOther,
    },
    {
      Icon: PriceIcon,
      label: t.hero.comparePriceLabel,
      mecha: t.hero.comparePriceMecha,
      other: t.hero.comparePriceOther,
    },
    {
      Icon: ScanIcon,
      label: t.hero.compareLightsLabel,
      mecha: t.hero.compareLightsMecha,
      other: t.hero.compareLightsOther,
    },
    {
      Icon: VaultIcon,
      label: t.hero.compareHistoryLabel,
      mecha: t.hero.compareHistoryMecha,
      other: t.hero.compareHistoryOther,
    },
  ];

  return (
    <section className="bg-bg">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <h2 className="text-center font-display text-[clamp(1.9rem,4vw,2.75rem)] font-semibold tracking-[-0.02em] text-ink-1">
          {t.hero.compareTitle}{" "}
          <span className="text-[#2563eb]">{t.hero.compareTitleAlt}</span>
        </h2>

        <div className="mt-14 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_minmax(0,1fr)] items-stretch gap-2.5 sm:gap-4">
          {/* Row labels, outside the cards (the reference layout). */}
          <div className="flex flex-col">
            <div className="h-16 shrink-0" aria-hidden="true" />
            {rows.map(({ label }) => (
              <div
                key={label}
                className="flex flex-1 items-center py-6 font-display text-sm font-semibold text-ink-1 sm:text-lg"
              >
                {label}
              </div>
            ))}
          </div>

          {/* MECHA — the white card. */}
          <div className="flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-sm">
            <div className="flex h-16 shrink-0 items-center justify-center border-b border-line px-3 text-center font-display text-lg font-semibold text-ink-1 sm:text-xl">
              {t.hero.compareMecha}
            </div>
            {rows.map(({ Icon, label, mecha }) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center justify-center gap-2 border-b border-line px-3 py-6 text-center last:border-b-0"
              >
                <Icon />
                <span className="font-display text-base font-semibold text-ink-1 sm:text-lg">
                  {mecha}
                </span>
              </div>
            ))}
          </div>

          {/* Other apps — muted, on the inset well. */}
          <div className="flex flex-col overflow-hidden rounded-[1.75rem] bg-inset">
            <div className="flex h-16 shrink-0 items-center justify-center border-b border-line px-3 text-center font-display text-lg font-semibold text-ink-2 sm:text-xl">
              {t.hero.compareOther}
            </div>
            {rows.map(({ label, other }) => (
              <div
                key={label}
                className="flex flex-1 items-center justify-center border-b border-line px-3 py-6 text-center last:border-b-0"
              >
                <span className="text-sm text-ink-2 sm:text-base">{other}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
