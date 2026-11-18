"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { HumanHelpCard } from "@/components/HumanHelpCard";
import ShopScript from "@/components/ShopScript";
import DiagnosisOutcome from "../../diagnose/DiagnosisOutcome";
import DiagnosisShare from "../../diagnose/DiagnosisShare";
import { apiFetch } from "@/lib/client/api";
import { getToken } from "@/lib/client/auth";
import type { DiagnosisReport } from "@/lib/server/ai";
import { driveVerdict } from "@/lib/server/diagnosisExtras";

/**
 * /app/diagnoses/[id] — one saved diagnosis, opened again (Pass
 * #20b). Until this page existed, a finished diagnosis could be
 * acted on only in the moment after its run: the dashboard's
 * Recent list and the Vault's history showed the entries as
 * static text, so the share link and the outcome prompt — both
 * built in Pass #20 — were unreachable for any past run.
 *
 * This page renders the STORED record (GET /api/diagnoses/[id],
 * owner-only): the same object the history lists and the share
 * card are built from, presented exactly as the result view
 * presented it — verdict headline first, then the summary, the
 * fair-price range the run itself produced, the likely parts,
 * the counter script, and the human-help card when the stored
 * severity warrants it. The share control and the outcome prompt
 * below work against the same saved id.
 */

interface DiagnosisDetail {
  id: string;
  vehicleId: string | null;
  vehicleInfo: string | null;
  problemText: string | null;
  aiResult: unknown;
  createdAt: string;
}

interface OutcomeView {
  whatFixed: string;
  costUsd: number | null;
  rating: number | null;
  quotePermission: boolean;
}

type Phase = "loading" | "ready" | "missing" | "error";

/** A stored record only renders as a result when it carries the
 * report's core fields — the same guard the share card applies. */
function asReport(value: unknown): DiagnosisReport | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Partial<DiagnosisReport>;
  return typeof r.diagnosis === "string" && typeof r.safeToDriver === "boolean"
    ? (value as DiagnosisReport)
    : null;
}

export default function DiagnosisDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? (rawId[0] ?? "") : (rawId ?? "");
  const [phase, setPhase] = useState<Phase>("loading");
  const [diagnosis, setDiagnosis] = useState<DiagnosisDetail | null>(null);
  const [outcome, setOutcome] = useState<OutcomeView | null>(null);
  const [editingOutcome, setEditingOutcome] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    if (!id) {
      setPhase("missing");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await apiFetch<{ diagnosis: DiagnosisDetail; outcome: OutcomeView | null }>(
        `/api/diagnoses/${id}`,
      );
      if (cancelled) return;
      if (res.status === 200 && res.data.diagnosis) {
        setDiagnosis(res.data.diagnosis);
        setOutcome(res.data.outcome ?? null);
        setPhase("ready");
      } else if (res.status === 404) {
        setPhase("missing");
      } else {
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const report = diagnosis ? asReport(diagnosis.aiResult) : null;

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <Link
          href="/app"
          className="text-base font-medium text-accent"
        >
          ← Back to dashboard
        </Link>

        {phase === "loading" && (
          <p className="mt-8 text-base text-ink-2" role="status">
            Loading…
          </p>
        )}

        {phase === "missing" && (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
            <h1 className="font-display text-2xl font-semibold text-ink-1">
              We couldn&apos;t find that diagnosis
            </h1>
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              The link may be old, or the diagnosis belongs to a different account. Your saved
              diagnoses are on your dashboard and in the Health Vault.
            </p>
            <Link
              href="/app/vault"
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              Open the Health Vault
            </Link>
          </section>
        )}

        {phase === "error" && (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
            <h1 className="font-display text-2xl font-semibold text-ink-1">
              That didn&apos;t load
            </h1>
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              Something went wrong opening this diagnosis. Nothing about it has changed — try
              again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              Try again
            </button>
          </section>
        )}

        {phase === "ready" && diagnosis && (
          <>
            <h1 className="mt-6 font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
              {diagnosis.vehicleInfo ?? "Diagnosis"}
            </h1>
            <p className="mt-1 text-sm text-ink-3">
              Diagnosed {new Date(diagnosis.createdAt).toLocaleDateString()}
            </p>
            {diagnosis.problemText && (
              <p className="mt-3 text-base leading-relaxed text-ink-2">
                You reported: {diagnosis.problemText}
              </p>
            )}

            {report ? (
              <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
                {/* The severity headline leads, exactly as it did on
                    the result screen — derived from the stored
                    report, so it is the run's own verdict. */}
                {(() => {
                  const verdict = driveVerdict(report);
                  return (
                    <div
                      className={
                        "border-l-4 pl-4 " +
                        (verdict.band === "stop"
                          ? "border-verdict-rip"
                          : verdict.band === "caution"
                            ? "border-verdict-warn"
                            : "border-verdict-fair")
                      }
                    >
                      <p className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                        {report.severity}
                      </p>
                      <h2
                        className={
                          "mt-1 font-display text-2xl font-semibold " +
                          (verdict.band === "stop"
                            ? "text-verdict-rip"
                            : verdict.band === "caution"
                              ? "text-verdict-warn"
                              : "text-verdict-fair")
                        }
                      >
                        {verdict.headline}
                      </h2>
                      <p className="mt-1 text-base leading-relaxed text-ink-2">{verdict.detail}</p>
                    </div>
                  );
                })()}
                <p className="mt-4 text-base leading-relaxed text-ink-1">{report.diagnosis}</p>
                {report.estimatedCost && (
                  <p className="mt-4 font-mono text-base text-ink-1">
                    Fair repair range: ${report.estimatedCost.min}–${report.estimatedCost.max}
                  </p>
                )}
                {report.parts.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                      Likely parts
                    </h3>
                    <ul className="mt-2 flex flex-col gap-2">
                      {report.parts.map((part) => (
                        <li key={part.name} className="text-base text-ink-1">
                          <span className="font-medium">{part.name}</span>{" "}
                          <span className="font-mono text-ink-2">{part.estimatedCost}</span>
                          <span className="block text-sm text-ink-2">{part.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.steps.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                      Next steps
                    </h3>
                    <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5">
                      {report.steps.map((step) => (
                        <li key={step} className="text-base text-ink-1">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {report.tip && (
                  <p className="mt-5 rounded-xl bg-raised px-4 py-3 text-base text-ink-1">
                    {report.tip}
                  </p>
                )}
                <p className="mt-5 text-sm leading-relaxed text-ink-3">{report.disclaimer}</p>
              </section>
            ) : (
              <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
                <p className="text-base leading-relaxed text-ink-2">
                  This diagnosis is saved, but its detailed result can&apos;t be shown in the
                  current format. The date and your description above are the record as saved.
                </p>
              </section>
            )}

            {/* The human-help route, on the same signals the result
                screen used: a Critical severity or a do-not-drive
                verdict gets the urgent card; a report that marked
                nothing most likely gets the not-narrowed-down card. */}
            {report && (report.severity === "Critical" || !report.safeToDriver) && (
              <div className="mt-6">
                <HumanHelpCard variant="urgent" audience="app" />
              </div>
            )}
            {report &&
              report.severity !== "Critical" &&
              report.safeToDriver &&
              report.parts.length > 0 &&
              !report.parts.some((part) => part.likelihood === "likely") && (
                <div className="mt-6">
                  <HumanHelpCard variant="unsure" audience="app" />
                </div>
              )}

            {report && <ShopScript report={report} vehicleInfo={diagnosis.vehicleInfo} />}

            <DiagnosisShare diagnosisId={diagnosis.id} />

            {/* The outcome: a saved one is shown as the record it
                is (with the chance to replace it); until one
                exists, the Pass #20 prompt stands ready. */}
            {outcome && !editingOutcome ? (
              <section
                className="mt-6 rounded-2xl border border-line bg-surface px-5 py-6"
                aria-label="What fixed it"
              >
                <h3 className="font-display text-xl font-semibold text-ink-1">What fixed it</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-1">{outcome.whatFixed}</p>
                {outcome.costUsd !== null && (
                  <p className="mt-1 text-base text-ink-2">It cost ${outcome.costUsd}.</p>
                )}
                {outcome.rating !== null && (
                  <p className="mt-1 text-base text-ink-2">
                    Your rating: {"★".repeat(outcome.rating)}
                    {"☆".repeat(Math.max(0, 5 - outcome.rating))}
                  </p>
                )}
                {outcome.quotePermission && (
                  <p className="mt-1 text-sm text-ink-3">
                    You said MECHA may quote this as a review.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setEditingOutcome(true)}
                  className="mt-4 flex h-12 items-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
                >
                  Update the outcome
                </button>
              </section>
            ) : (
              <>
                <DiagnosisOutcome diagnosisId={diagnosis.id} />
                {outcome && editingOutcome && (
                  <button
                    type="button"
                    onClick={() => setEditingOutcome(false)}
                    className="mt-4 flex h-12 items-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
                  >
                    Keep the saved outcome instead
                  </button>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
