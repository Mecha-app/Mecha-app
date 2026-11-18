"use client";

import { useState } from "react";
import type { DiagnosisReport } from "@/lib/server/ai";
import { buildShopScript } from "@/lib/server/diagnosisExtras";

/**
 * "What to tell the shop" (Pass #20, the AIMECH lesson) — the named
 * closing block of a diagnosis result: the exact words the driver
 * can read out or show at the counter, assembled by template from
 * the finished report (lib/server/diagnosisExtras) — never a new AI
 * call, never a claim the report didn't make. One tap copies the
 * whole script.
 */
export default function ShopScript({
  report,
  vehicleInfo,
}: {
  report: DiagnosisReport;
  vehicleInfo?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const lines = buildShopScript(report, vehicleInfo);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(lines.join(" "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable (permissions, old browser) — the text
      // is on screen to read aloud; nothing else to do.
    }
  }

  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6"
      aria-label="What to tell the shop"
    >
      <h3 className="font-display text-xl font-semibold text-ink-1">What to tell the shop</h3>
      <p className="mt-1 text-sm text-ink-2">Read this out, or show your phone at the counter.</p>
      <div className="mt-4 flex flex-col gap-3">
        {lines.map((line) => (
          <p key={line} className="text-base leading-relaxed text-ink-1">
            {line}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void onCopy()}
        className="mt-5 flex h-12 items-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
      >
        {copied ? "Copied" : "Copy the script"}
      </button>
    </section>
  );
}
