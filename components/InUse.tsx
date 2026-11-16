import { LoopClip } from "./LoopClip";
import { Reveal } from "./Reveal";

/**
 * The product in use — a wordless band of loops directly under the
 * hero film (design pass "Tesla", 2026-11-16, owner: "show people
 * using the product, not text"). Three moments: a recall alert read
 * beside the car, the shop quote checked line by line, the diagnosis
 * shown to the mechanic. No heading, no caption — the pictures are
 * the section.
 *
 * Design pass "Hero" (2026-11-16, owner: "put females in the
 * GIFs"): the first slot is now the alert loop — a woman checking
 * the alert on her phone beside her car — replacing the diagnose
 * loop in this band (its files stay in /public/videos/loops).
 */
export function InUse() {
  return (
    <section aria-hidden="true">
      <div className="mx-auto w-full max-w-6xl px-4 pb-4 pt-14 sm:px-6">
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <figure className="overflow-hidden rounded-2xl border border-line">
              <LoopClip name="alert" />
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
