"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { authHeaders, clearSession, getToken } from "@/lib/client/auth";
import type { DiagnosisReport } from "@/lib/server/ai";
import { DIAGNOSE_PREFILL_KEY, type ScanDiagnosePrefill } from "@/lib/server/scan";

/**
 * /app/diagnose (WP5) — the roadside diagnosis screen, MOBILE-FIRST:
 * built for a stranded driver on a phone — one column, large targets,
 * the countdown always visible, the answer STREAMED so the screen
 * responds immediately instead of spinning (the old app's failure).
 *
 * The countdown shown here always comes from the server: the `quota`
 * event opens the stream, the `done` event closes it with the count
 * after this diagnosis, and /api/auth/me seeds it on load.
 */

interface QuotaView {
  plan: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  canDiagnose: boolean;
}

type Phase = "loading" | "ready" | "streaming" | "done" | "blocked" | "error";

const NL = String.fromCharCode(10);

export default function DiagnosePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [quota, setQuota] = useState<QuotaView | null>(null);
  const [message, setMessage] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [problem, setProblem] = useState("");
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [receivedChars, setReceivedChars] = useState(0);
  const [detail, setDetail] = useState("");

  useEffect(() => {
    // Scan handoff (Scan package): /app/scan may arrive here with a
    // prefilled problem + vehicle (a decoded VIN, an identified light,
    // a fault code). Read it once, apply it, clear it — a stale
    // prefill must never leak into a later, unrelated diagnosis.
    try {
      const raw = sessionStorage.getItem(DIAGNOSE_PREFILL_KEY);
      if (raw) {
        sessionStorage.removeItem(DIAGNOSE_PREFILL_KEY);
        const prefill = JSON.parse(raw) as Partial<ScanDiagnosePrefill>;
        if (typeof prefill.problem === "string") setProblem(prefill.problem);
        if (typeof prefill.vehicleInfo === "string") setVehicleInfo(prefill.vehicleInfo);
      }
    } catch {
      // Private mode or a corrupt value — the page just opens unfilled.
    }
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        window.location.href = "/login";
        return;
      }
      try {
        const res = await fetch("/api/auth/me", { headers: { ...authHeaders() } });
        if (res.status === 401) {
          clearSession();
          window.location.href = "/login";
          return;
        }
        const data = (await res.json()) as { quota?: QuotaView; message?: string };
        if (cancelled) return;
        if (data.quota) {
          setQuota(data.quota);
          setMessage(data.message ?? "");
          setPhase(data.quota.canDiagnose ? "ready" : "blocked");
        } else {
          setPhase("ready");
        }
      } catch {
        if (!cancelled) setPhase("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (problem.trim().length === 0) return;
    setPhase("streaming");
    setReport(null);
    setReceivedChars(0);
    setDetail("");
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ problem: problem.trim(), vehicleInfo: vehicleInfo.trim() || undefined }),
      });

      if (res.status === 402) {
        const data = (await res.json()) as { quota?: QuotaView; message?: string };
        if (data.quota) setQuota(data.quota);
        setMessage(data.message ?? "");
        setPhase("blocked");
        return;
      }
      if (res.status === 401) {
        clearSession();
        window.location.href = "/login";
        return;
      }
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        setDetail(data.detail ?? "The diagnosis could not be completed. Please try again.");
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chars = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(NL + NL);
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const dataLine = block
            .split(NL)
            .find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          let event: {
            type?: string;
            text?: string;
            report?: DiagnosisReport;
            quota?: QuotaView;
            message?: string;
            detail?: string;
          };
          try {
            event = JSON.parse(dataLine.slice("data:".length).trim());
          } catch {
            continue;
          }
          if (event.type === "quota" && event.quota) {
            setQuota(event.quota);
            if (event.message) setMessage(event.message);
          } else if (event.type === "delta" && typeof event.text === "string") {
            chars += event.text.length;
            setReceivedChars(chars);
          } else if (event.type === "done" && event.report) {
            setReport(event.report);
            if (event.quota) setQuota(event.quota);
            if (event.message) setMessage(event.message);
            setPhase("done");
          } else if (event.type === "error") {
            setDetail(event.detail ?? "The diagnosis could not be completed.");
            setPhase("error");
          }
        }
      }
      setPhase((p) => (p === "streaming" ? "ready" : p));
    } catch {
      setDetail("The diagnosis could not be completed. Please try again.");
      setPhase("error");
    }
  }

  const exhausted = quota !== null && quota.plan !== "pro" && quota.remaining === 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
        Diagnose my car
      </h1>

      {/* The countdown — server-stated, always visible. */}
      {quota && (
        <div
          className="mt-5 rounded-2xl border border-line bg-surface px-5 py-4"
          role="status"
          aria-live="polite"
        >
          {quota.plan === "pro" ? (
            <p className="text-base font-medium text-ink-1">Pro plan — unlimited diagnoses.</p>
          ) : (
            <>
              <p className="font-display text-2xl font-semibold text-ink-1">
                {quota.remaining} of {quota.limit} free{" "}
                {quota.remaining === 1 ? "diagnosis" : "diagnoses"} left
              </p>
              <p className="mt-1 text-base text-ink-2">{message}</p>
            </>
          )}
        </div>
      )}

      {phase === "blocked" || exhausted ? (
        <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
          <h2 className="font-display text-xl font-semibold text-ink-1">
            You are out of free diagnoses
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-2">
            {message ||
              "You've used all 5 of your free diagnoses. A MECHA Pro subscription is required to run more diagnoses — nothing is charged until you choose a plan."}
          </p>
          {/* Sweep fix: /pricing is not a route yet — the pricing
              section on the homepage carries the plans today. */}
          <Link
            href="/#pricing"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            See MECHA Pro
          </Link>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
          <div>
            <label htmlFor="diag-vehicle" className="block text-sm font-medium text-ink-2">
              Your car
            </label>
            <input
              id="diag-vehicle"
              className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
              placeholder="e.g. 2019 Honda Accord"
              autoComplete="off"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="diag-problem" className="block text-sm font-medium text-ink-2">
              What is happening?
            </label>
            <textarea
              id="diag-problem"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink-1 placeholder:text-ink-3"
              placeholder="Describe the noise, the light, the feeling — in your own words."
              rows={5}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              required
            />
          </div>

          {phase === "error" && (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
              {detail}
            </p>
          )}

          <button
            type="submit"
            disabled={phase === "streaming" || phase === "loading"}
            className="h-14 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
          >
            {phase === "streaming" ? "Diagnosing…" : "Run diagnosis"}
          </button>
          {phase === "streaming" && (
            <p className="text-center text-sm text-ink-2" role="status">
              Your answer is arriving now ({receivedChars} characters received)…
            </p>
          )}
        </form>
      )}

      {report && (
        <section className="mt-10 rounded-2xl border border-line bg-surface px-5 py-6" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                "rounded-full px-3 py-1 text-sm font-semibold " +
                (report.severity === "Critical"
                  ? "text-verdict-rip"
                  : report.severity === "Minor — Monitor"
                    ? "text-verdict-fair"
                    : "text-verdict-warn")
              }
            >
              {report.severity}
            </span>
            <span className="text-sm text-ink-2">
              {report.safeToDriver ? "Safe to drive carefully" : "Do not drive — get a tow"}
            </span>
          </div>
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
                What to do next
              </h3>
              <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5">
                {report.steps.map((step) => (
                  <li key={step} className="text-base text-ink-1">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {report.tip && (
            <p className="mt-5 rounded-xl bg-raised px-4 py-3 text-base text-ink-1">{report.tip}</p>
          )}
          <p className="mt-5 text-sm leading-relaxed text-ink-3">{report.disclaimer}</p>
        </section>
      )}
    </main>
  );
}
