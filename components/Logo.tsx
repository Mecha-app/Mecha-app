/**
 * "The Gauge M" — MECHA logo, Concept A (DESIGN_SYSTEM §1.4, RECOMMENDED).
 * Hand-written SVG geometry, not a picture:
 *  - 48×48 grid, strokes = 8 units (the spec's 4-unit grid scaled ×2).
 *  - Bold M: two vertical outer stems; the inner V is the gauge NEEDLE —
 *    it descends and stops short of the baseline, at rest.
 *  - A short signal-amber arc sweeps 100° across the top-right vertex,
 *    like the lit segment of a tachometer.
 * Ships as mark-only (favicon / QR sticker / app icon) and full lockup
 * (mark + MECHA in Space Grotesk 700, tracked +0.04em).
 * Final lockup remains Frantz's veto-on-sight.
 */
export function GaugeMMark({
  size = 40,
  className,
  title = "MECHA",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* M body: stems x=6 and x=42, baseline y=42, top y=10.
          Left stem → down-right diagonal to the needle tip at (24, 30) —
          the inner V stops 12 units short of the baseline (needle at rest) —
          then up to the right stem top. */}
      <path
        d="M6 42 V10 L24 30 L42 10 V42"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Amber arc: 100° sweep hugging the top-right vertex.
          Centered on (42, 10), radius 10, from -160° to -60° in dial terms —
          drawn as the arc passing over the vertex's upper-left shoulder,
          clear of the stroke so it reads as a lit tach segment. */}
      <path
        d="M33.6 3.4 A10 10 0 0 1 46.9 5.2"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoLockup({ markSize = 36 }: { markSize?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink-1">
      <GaugeMMark size={markSize} />
      <span
        className="font-display text-[22px] font-bold leading-none"
        style={{ letterSpacing: "0.04em" }}
      >
        MECHA
      </span>
    </span>
  );
}
