/**
 * LoopClip — a short, muted, autoplaying loop of a person using the
 * product: real moments (a driver checking a warning light in the
 * app, a quote checked at the counter, the diagnosis shown to a
 * mechanic, a recall alert read beside the car). GIF-style ambience,
 * no sound, no controls, decorative — it carries no information the
 * page doesn't state elsewhere, so it is hidden from assistive tech.
 * Sources live in /public/videos/loops (webm first, mp4 fallback,
 * poster for the first paint).
 *
 * Two shapes: the default framed tile (aspect-video), and `fill` —
 * an absolute, full-bleed background layer (the homepage hero,
 * design pass "Hero" 2026-11-16: the product in use IS the hero
 * visual, the way Tesla's hero is the car).
 */
export function LoopClip({
  name,
  className = "",
  fill = false,
}: {
  /** File stem: /videos/loops/loop-<name>.{webm,mp4} + poster. */
  name: "diagnose" | "quote" | "mechanic" | "roadside" | "hero" | "alert";
  className?: string;
  /** Render as an absolute full-bleed background layer. */
  fill?: boolean;
}) {
  return (
    <video
      className={
        fill
          ? `absolute inset-0 h-full w-full object-cover ${className}`
          : `aspect-video w-full bg-black object-cover ${className}`
      }
      autoPlay
      muted
      loop
      playsInline
      preload={fill ? "auto" : "metadata"}
      poster={`/videos/loops/loop-${name}-poster.webp`}
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={`/videos/loops/loop-${name}.webm`} type="video/webm" />
      <source src={`/videos/loops/loop-${name}.mp4`} type="video/mp4" />
    </video>
  );
}
