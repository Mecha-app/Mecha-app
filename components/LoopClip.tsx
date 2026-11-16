/**
 * LoopClip — a short, muted, autoplaying loop cut from MECHA's own
 * product films: real moments of people using the product (a driver
 * checking a warning light in the app, a quote checked at the counter,
 * the diagnosis shown to a mechanic). GIF-style ambience, no sound,
 * no controls, decorative — it carries no information the page
 * doesn't state elsewhere, so it is hidden from assistive tech.
 * Sources live in /public/videos/loops (webm first, mp4 fallback,
 * poster for the first paint).
 */
export function LoopClip({
  name,
  className = "",
}: {
  /** File stem: /videos/loops/loop-<name>.{webm,mp4} + poster. */
  name: "diagnose" | "quote" | "mechanic" | "roadside";
  className?: string;
}) {
  return (
    <video
      className={`aspect-video w-full bg-black object-cover ${className}`}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={`/videos/loops/loop-${name}-poster.webp`}
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={`/videos/loops/loop-${name}.webm`} type="video/webm" />
      <source src={`/videos/loops/loop-${name}.mp4`} type="video/mp4" />
    </video>
  );
}
