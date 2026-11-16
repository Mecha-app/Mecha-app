"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/client/auth";
import type { DiagnosisReport } from "@/lib/server/ai";
import type { PartsBlock } from "@/lib/server/parts";

/**
 * The "What to do next" block (parts affiliate package) — rendered
 * AFTER the full diagnosis report on /app/diagnose: verdict, causes,
 * and next steps always come first; this block is what the driver
 * does with the answer. Two doors: order the exact parts the
 * diagnosis points to (fitted to their vehicle), or hand the job to
 * a shop nearby.
 *
 * This component is a dumb renderer: every word — the fitment note,
 * the links, the always-present commission disclosure — comes from
 * POST /api/parts/links, which builds render data from the FINISHED
 * report via lib/server/parts.ts. The affiliate layer has no path
 * back into the diagnosis (see parts.ts, rule c). If the fetch fails
 * for any reason the report simply stands alone, exactly as before —
 * no placeholder links, no fabricated prices, ever.
 */
export default function PartsNextSteps({
  report,
  vehicleInfo,
}: {
  report: DiagnosisReport;
  vehicleInfo: string;
}) {
  const [block, setBlock] = useState<PartsBlock | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/parts/links", {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            report,
            vehicle: { vehicleInfo: vehicleInfo.trim() || undefined },
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { block?: PartsBlock };
        if (!cancelled && data.block) setBlock(data.block);
      } catch {
        // The report stands alone — see the header comment.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report, vehicleInfo]);

  if (!block) return null;

  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6"
      aria-label={block.heading}
    >
      <h3 className="font-display text-xl font-semibold text-ink-1">{block.heading}</h3>
      <p className="mt-2 text-base leading-relaxed text-ink-2">{block.intro}</p>

      {/* Door 1 — order the parts (DIY drivers, hands-on owners, shops). */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
          {block.doors.diy.label}
        </h4>
        <p className="mt-1 text-sm text-ink-2">{block.doors.diy.note}</p>
        {block.parts.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-5">
            {block.parts.map((part) => (
              <li key={part.name} className="border-t border-line pt-4">
                <p className="text-base text-ink-1">
                  <span className="font-medium">{part.name}</span>{" "}
                  <span className="text-sm text-ink-2">— {part.likelihoodLabel}</span>
                </p>
                {part.whyNeeded && (
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{part.whyNeeded}</p>
                )}
                {part.estimateLabel && (
                  <p className="mt-1 font-mono text-sm text-ink-2">{part.estimateLabel}</p>
                )}
                <p className="mt-1 text-sm text-ink-3">{part.fitmentNote}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {part.links.map((link) => (
                    <a
                      key={link.retailerKey}
                      href={link.url}
                      target="_blank"
                      rel={link.rel}
                      className="flex min-h-12 items-center rounded-full border border-line bg-raised px-4 text-sm font-semibold text-ink-1"
                    >
                      {link.retailerName} — {part.priceCta}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-2">
            This diagnosis didn't name a specific part — a shop inspection is the right next step.
          </p>
        )}
      </div>

      {/* Door 2 — done for you: the nearby shops path. */}
      <div className="mt-8 border-t border-line pt-5">
        <h4 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
          {block.doors.doneForYou.label}
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{block.doors.doneForYou.note}</p>
        <Link
          href="/app/nearby"
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
        >
          Find shops &amp; towing near you
        </Link>
      </div>

      {block.discountNote && (
        <p className="mt-6 text-sm leading-relaxed text-ink-2">
          {block.discountNote.retailerName}: {block.discountNote.label}{" "}
          <a
            href={block.discountNote.termsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-1 underline"
          >
            See the program terms
          </a>
          .
        </p>
      )}

      {/* FTC disclosure — always rendered with the block (rule b). */}
      <p className="mt-6 text-sm leading-relaxed text-ink-3">{block.disclosure}</p>
    </section>
  );
}
