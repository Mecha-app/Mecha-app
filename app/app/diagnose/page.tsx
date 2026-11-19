"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckoutReturnTracker } from "@/components/CheckoutReturnTracker";
import { HumanHelpCard } from "@/components/HumanHelpCard";
import DiagnosisOutcome from "./DiagnosisOutcome";
import DiagnosisShare from "./DiagnosisShare";
import PartsNextSteps from "@/components/PartsNextSteps";
import SavedVehicleField from "@/components/SavedVehicleField";
import ShopScript from "@/components/ShopScript";
import { AppNav } from "@/components/AppNav";
import { authHeaders, clearSession, getToken } from "@/lib/client/auth";
import { trackEvent } from "@/lib/client/analytics";
import type { DiagnosisReport } from "@/lib/server/ai";
import { driveVerdict } from "@/lib/server/diagnosisExtras";
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
  limit: number;
  remaining: number;
  /** Purchased single credits on hand (never expire). */
  credits?: number;
  /** The Pro monthly bucket, when the plan carries one. */
  bucket?: { limit: number; used: number; remaining: number } | null;
  canDiagnose: boolean;
  /** "shop" when the signed-in account is a shop diagnosing against
   * its trial/plan shelves (2026-11-19); absent for drivers. */
  accountKind?: string;
  trial?: {
    active: boolean;
    daysLeft: number;
    endedReason: "time" | "credits" | null;
  } | null;
}

type Phase = "loading" | "ready" | "streaming" | "done" | "blocked" | "error";

const NL = String.fromCharCode(10);

export default function DiagnosePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [quota, setQuota] = useState<QuotaView | null>(null);
  const [message, setMessage] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  // The saved vehicle the run belongs to, when the car was picked from
  // the garage (Pass 15) — sent with the request so the saved record
  // links to the vehicle; null for a typed-in car.
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  // The saved record's id, carried on the stream's done event
  // (Pass #20) — the share link and outcome prompt key off it.
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [receivedChars, setReceivedChars] = useState(0);
  const [detail, setDetail] = useState("");
  // The paywall's purchase doors (credit model, 2026-11-18).
  const [buying, setBuying] = useState<"pro" | "credit" | "business" | null>(null);
  const [paywallError, setPaywallError] = useState("");
  // A shop runs this same screen against its own shelves (2026-11-19).
  const isShop = quota?.accountKind === "shop";

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
        if (typeof prefill.vehicleId === "string") setVehicleId(prefill.vehicleId);
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
        const data = (await res.json()) as {
          quota?: QuotaView;
          message?: string;
        };
        if (cancelled) return;
        // No phone wall (owner's rules, 2026-11-16): a signed-in
        // account is all a diagnosis requires — a phone-less account
        // stays on this page and diagnoses; the number is collected
        // by the dashboard's optional card, never by a redirect.
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
    // Funnel (analytics pass): the run started. The event carries no
    // parameters — never the problem text or the vehicle.
    trackEvent("diagnosis_started");
    setReport(null);
    setDiagnosisId(null);
    setReceivedChars(0);
    setDetail("");
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          problem: problem.trim(),
          vehicleInfo: vehicleInfo.trim() || undefined,
          vehicleId: vehicleId ?? undefined,
        }),
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
      if (res.status === 403) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
        setDetail(data.detail ?? "The diagnosis could not be completed. Please try again.");
        setPhase("error");
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
            diagnosisId?: string | null;
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
            setDiagnosisId(event.diagnosisId ?? null);
            trackEvent("diagnosis_completed");
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

  // The paywall shows whenever NOTHING is left on any shelf — free
  // diagnoses, the Pro monthly bucket, purchased singles (the server
  // computes canDiagnose across all three).
  const exhausted = quota !== null && !quota.canDiagnose;
  const proSpent = exhausted && quota?.plan === "pro";

  // Funnel (analytics pass): the paywall was SEEN — fired once when
  // the two doors first render, whether the driver arrived blocked
  // at load or hit the wall on a 402 mid-run.
  const paywallTracked = useRef(false);
  const paywallShown = phase === "blocked" || exhausted;
  useEffect(() => {
    if (paywallShown && !paywallTracked.current) {
      paywallTracked.current = true;
      trackEvent("paywall_viewed");
    }
  }, [paywallShown]);

  async function buyDoor(plan: "pro" | "credit" | "business") {
    setBuying(plan);
    setPaywallError("");
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; detail?: string };
      if (res.status === 200 && data.url) {
        trackEvent("checkout_started", {
          product: plan === "pro" ? "pro" : plan === "business" ? "business" : "single_credit",
        });
        window.location.href = data.url;
        return;
      }
      // Not wired yet (501) or refused: the server's own words, on the
      // card — never a dead button.
      setPaywallError(data.detail ?? "Payments could not be started. Please try again.");
    } catch {
      setPaywallError("Payments could not be started. Please try again.");
    }
    setBuying(null);
  }

  return (
    <>
      <AppNav />
      {/* Stripe returns the single-credit buyer to this page
          (?checkout=success) — the purchase_completed event. */}
      <CheckoutReturnTracker product="single_credit" />
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {isShop ? "Diagnose a car" : "Diagnose my car"}
        </h1>

        {/* The countdown — server-stated, always visible. It names
            the shelf being drawn from: free diagnoses first, then
            the Pro monthly bucket, then purchased singles. */}
        {quota && (
          <div
            className="mt-5 rounded-2xl border border-line bg-surface px-5 py-4"
            role="status"
            aria-live="polite"
          >
            {quota.remaining > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold text-ink-1">
                  {quota.remaining} of {quota.limit} free{isShop ? " trial" : ""}{" "}
                  {quota.remaining === 1 ? "diagnosis" : "diagnoses"} left
                </p>
                <p className="mt-1 text-base text-ink-2">{message}</p>
              </>
            ) : quota.bucket && quota.bucket.remaining > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold text-ink-1">
                  {isShop ? "Shop plan" : "Pro"} — {quota.bucket.remaining} of {quota.bucket.limit} monthly diagnoses left
                </p>
                <p className="mt-1 text-base text-ink-2">{message}</p>
              </>
            ) : quota.credits && quota.credits > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold text-ink-1">
                  {quota.credits} purchased {quota.credits === 1 ? "diagnosis" : "diagnoses"} left
                </p>
                <p className="mt-1 text-base text-ink-2">{message}</p>
              </>
            ) : (
              <p className="text-base text-ink-2">{message}</p>
            )}
          </div>
        )}

        {phase === "blocked" || exhausted ? (
          isShop ? (
            <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
              <h2 className="font-display text-xl font-semibold text-ink-1">
                {quota?.plan === "business"
                  ? "Your Shop plan's monthly credits are used up"
                  : "Your free trial has ended"}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-ink-2">
                {message ||
                  "Your free trial has ended — 14 days free, 25 diagnoses on us, no card. Subscribe to MECHA for Shops ($149/mo, 500 diagnoses a month) to keep diagnosing cars in your shop — nothing is charged until you choose."}
              </p>
              {quota?.plan !== "business" && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => void buyDoor("business")}
                    disabled={buying !== null}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
                  >
                    {buying === "business" ? "Opening checkout…" : "Subscribe to MECHA for Shops — $149/mo"}
                  </button>
                </div>
              )}
              {quota?.plan === "business" && (
                <p className="mt-3 text-sm leading-relaxed text-ink-2">
                  Your 500 monthly credits renew with your next billing cycle.
                </p>
              )}
              {paywallError && (
                <p className="mt-3 text-base text-ink-1" role="alert">
                  {paywallError}
                </p>
              )}
              <Link
                href="/pricing"
                className="mt-4 inline-block text-base font-medium text-accent underline underline-offset-4"
              >
                Compare the plans
              </Link>
            </section>
          ) : (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-6">
            <h2 className="font-display text-xl font-semibold text-ink-1">
              {proSpent ? "Your Pro monthly credits are used up" : "You are out of free diagnoses"}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              {message ||
                (proSpent
                  ? "Your 100 monthly credits renew with your next cycle. Buy one diagnosis now, or wait for the renewal — nothing is charged until you choose."
                  : "You've used all 5 of your free diagnoses. Buy one diagnosis for $4, or subscribe to MECHA Pro for 100 diagnoses a month — nothing is charged until you choose.")}
            </p>
            {/* The funnel (owner, 2026-11-18): TWO doors, side by
                side — subscribe for the monthly bundle, or buy ONE
                diagnosis. A Pro subscriber whose bucket is spent
                gets the buy-one door (top-up) and the wait. */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {!proSpent && (
                <button
                  type="button"
                  onClick={() => void buyDoor("pro")}
                  disabled={buying !== null}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
                >
                  {buying === "pro" ? "Opening checkout…" : "Subscribe to Pro — $9.99/mo"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void buyDoor("credit")}
                disabled={buying !== null}
                className={
                  proSpent
                    ? "flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
                    : "flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface px-6 text-base font-semibold text-ink-1 disabled:opacity-60"
                }
              >
                {buying === "credit" ? "Opening checkout…" : "Buy 1 diagnosis — $4"}
              </button>
            </div>
            {proSpent && (
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Or wait — your monthly credits renew with your next billing cycle.
              </p>
            )}
            {paywallError && (
              <p className="mt-3 text-base text-ink-1" role="alert">
                {paywallError}
              </p>
            )}
            {/* The standalone pricing route carries the full plans,
                meter explanation, and billing FAQ. */}
            <Link
              href="/pricing"
              className="mt-4 inline-block text-base font-medium text-accent underline underline-offset-4"
            >
              Compare the plans
            </Link>
          </section>
          )
        ) : (
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            {/* The car: a picker of the driver's saved vehicles when
                he has any (Pass 15 — he already added the car to his
                garage; never make him re-type it), free text otherwise
                or on "Other vehicle…". A picked vehicle also sends its
                id, which is what links the saved diagnosis record to
                the vehicle in the Health Vault. */}
            <SavedVehicleField
              id="diag-vehicle"
              label={isShop ? "The car" : "Your car"}
              placeholder="Year, make, and model"
              otherOptionLabel="Other vehicle…"
              savedOptionLabel="Use a saved vehicle"
              value={vehicleInfo}
              vehicleId={vehicleId}
              onChange={(info, id) => {
                setVehicleInfo(info);
                setVehicleId(id);
              }}
            />
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
                Diagnosing… ({receivedChars})
              </p>
            )}
          </form>
        )}

        {report && (
          <section className="mt-10 rounded-2xl border border-line bg-surface px-5 py-6" aria-live="polite">
            {/* The severity headline (Pass #20, the FIXD lesson): the
                result LEADS with the safe-to-drive verdict — the one
                thing a stranded driver needs first — with the detail
                under it and the severity label kept as the eyebrow. */}
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
                      <span className="font-medium">{part.name}</span>
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
              <p className="mt-5 rounded-xl bg-raised px-4 py-3 text-base text-ink-1">{report.tip}</p>
            )}
            <p className="mt-5 text-sm leading-relaxed text-ink-3">{report.disclaimer}</p>
          </section>
        )}

        {/* The human-help route (pass #19, owner order) — shown
            from the finished report's own signals, no backend
            change: a Critical severity or a do-not-drive verdict
            gets the urgent card (stop-driving guidance + shops
            near you); a report whose causes are ALL conditional —
            the model marked nothing most likely — gets the
            not-narrowed-down card instead of false confidence. */}
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

        {/* After the verdict, the causes, and the next steps — never
            above them: the parts / shops block built from this finished
            report (parts affiliate package; see lib/server/parts.ts). */}
        {report && <PartsNextSteps report={report} vehicleInfo={vehicleInfo} />}

        {/* The closing blocks of a finished result (Pass #20): the
            counter script first, then the share card and the outcome
            prompt — both keyed to the saved record's id, so they
            render only when the run was actually saved. For a SHOP
            run the record is the shop's own (0020): the counter
            script is a driver's tool, and the share/outcome/detail
            surfaces are driver-scoped today, so all three are
            driver-only here. */}
        {report && !isShop && <ShopScript report={report} vehicleInfo={vehicleInfo} />}
        {/* The saved record's own page (Pass #20b): this run is
            filed the moment it finishes, and its detail view shows
            the stored report — the range here and the range there
            are the same number, checkable in one tap. */}
        {report && diagnosisId && !isShop && (
          <p className="mt-6">
            <Link
              href={`/app/diagnoses/${diagnosisId}`}
              className="text-base font-medium text-accent"
            >
              View this diagnosis — it is saved to your history
            </Link>
          </p>
        )}
        {report && diagnosisId && !isShop && <DiagnosisShare diagnosisId={diagnosisId} />}
        {report && diagnosisId && !isShop && <DiagnosisOutcome diagnosisId={diagnosisId} />}
      </main>
    </>
  );
}
