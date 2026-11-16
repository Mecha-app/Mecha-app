import { LoopClip } from "./LoopClip";
import { Reveal } from "./Reveal";

/**
 * The product in use — a wordless band of loops directly under the
 * hero (design pass "Tesla", 2026-11-16, owner: "show people using
 * the product, not text"). Three moments from MECHA's own films: the
 * warning light checked in the app, the shop quote checked line by
 * line, the diagnosis shown to the mechanic. No heading, no caption —
 * the pictures are the section.
 */
export function InUse() {
  return (
    <section aria-hidden="true">
      <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <figure className="overflow-hidden rounded-2xl border border-line">
              <LoopClip name="diagnose" />
            </figure>
            <figure className="overflow-hidden rounded-2xl border border-line">
              <LoopClip name="quote" />
            </figure>
            <figure className="hidden overflow-hidden rounded-2xl border border-line sm:block">
              <LoopClip name="mechanic" />
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
