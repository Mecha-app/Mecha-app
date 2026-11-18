"use client";

import { useState, type FormEvent } from "react";
import { authHeaders } from "@/lib/client/auth";

/**
 * "What fixed it?" (Pass #20 — the CarMD seed) — a dismissible,
 * optional prompt under a finished diagnosis. The driver's answer
 * is stored against the diagnosis (POST /api/diagnoses/[id]/
 * outcome) and starts MECHA's own verified-fix record. It never
 * blocks the result, never nags twice in a session: dismissing or
 * saving closes it for this diagnosis, full stop.
 */
export default function DiagnosisOutcome({ diagnosisId }: { diagnosisId: string }) {
  const [state, setState] = useState<"open" | "saving" | "saved" | "dismissed" | "error">("open");
  const [whatFixed, setWhatFixed] = useState("");
  const [cost, setCost] = useState("");
  // Optional, both of them: a 1–5 star rating of the diagnosis, and
  // explicit permission to quote these words as a review someday.
  // Untouched either way unless the driver chooses — no pre-ticks.
  const [rating, setRating] = useState(0);
  const [quotePermission, setQuotePermission] = useState(false);

  if (state === "dismissed") return null;

  if (state === "saved") {
    return (
      <section
        className="mt-6 rounded-2xl border border-line bg-surface px-5 py-5"
        aria-label="Outcome recorded"
      >
        <p className="text-base text-ink-1" role="status">
          Noted — thank you. Real fixes like yours are how MECHA&apos;s answers get sharper.
        </p>
      </section>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!whatFixed.trim()) return;
    setState("saving");
    try {
      const res = await fetch(`/api/diagnoses/${diagnosisId}/outcome`, {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          whatFixed: whatFixed.trim(),
          costUsd: cost.trim() ? Number(cost) : undefined,
          rating: rating > 0 ? rating : undefined,
          quotePermission,
        }),
      });
      setState(res.ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <section
      className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6"
      aria-label="Tell MECHA what fixed it"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink-1">
            Already fixed it? Tell MECHA what worked
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Optional — it helps the next driver with the same problem, and it takes ten seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setState("dismissed")}
          aria-label="Dismiss"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-lg text-ink-2"
        >
          ×
        </button>
      </div>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        <input
          value={whatFixed}
          onChange={(e) => setWhatFixed(e.target.value)}
          placeholder="What fixed it? e.g. New spark plugs and one coil"
          aria-label="What fixed it"
          className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
          maxLength={300}
          required
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="What did it cost? ($, optional)"
            aria-label="What it cost in dollars"
            inputMode="numeric"
            className="h-12 w-full flex-1 rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
          />
          <button
            type="submit"
            disabled={state === "saving" || !whatFixed.trim()}
            className="flex h-12 shrink-0 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Save the outcome"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-2" id="outcome-rating-label">
            How good was this diagnosis? (optional)
          </span>
          <div className="flex gap-1" role="radiogroup" aria-labelledby="outcome-rating-label">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(rating === star ? 0 : star)}
                className={
                  "flex h-12 w-12 items-center justify-center rounded-full border text-xl " +
                  (rating >= star ? "border-accent text-accent" : "border-line text-ink-3")
                }
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-2">
          <input
            type="checkbox"
            checked={quotePermission}
            onChange={(e) => setQuotePermission(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          MECHA may quote my words as a review. (Optional — unticked means never.)
        </label>
        {state === "error" && (
          <p className="text-sm text-verdict-rip" role="alert">
            That didn&apos;t save — please try again.
          </p>
        )}
      </form>
    </section>
  );
}
