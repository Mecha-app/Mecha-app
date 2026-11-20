"use client";

import { useState } from "react";
import { authHeaders } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * The shop diagnose panel's three doors (owner spec, 2026-11-20):
 * a shop starts a diagnosis by (1) entering the car's VIN — decoded
 * through the existing NHTSA vPIC route, (2) typing the vehicle in
 * by hand — year / make / model / engine size / mileage, the fields
 * the diagnosis itself carries, or (3) searching a fault code in
 * the same catalog the public /codes pages render, then running
 * the diagnosis for that code. Each door fills the shared form
 * below (the car field, or the problem field for the code door);
 * the form stays the one submit path, so quota, paywall, and the
 * report all behave exactly as before. One door open at a time;
 * the panel is one compact card on mobile.
 */
export function ShopDiagnoseDoors({
  onVehicle,
  onProblem,
}: {
  onVehicle: (info: string) => void;
  onProblem: (text: string) => void;
}) {
  const { t } = useLocale();
  const d = t.wp6.diagnoseDoors;
  const [open, setOpen] = useState<"vin" | "manual" | "code" | null>(null);
  const [using, setUsing] = useState("");

  // Door 1 — VIN decode.
  const [vin, setVin] = useState("");
  const [vinBusy, setVinBusy] = useState(false);
  const [vinSummary, setVinSummary] = useState("");
  const [vinNote, setVinNote] = useState("");

  // Door 2 — manual vehicle.
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [engine, setEngine] = useState("");
  const [mileage, setMileage] = useState("");

  // Door 3 — fault-code lookup.
  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codeHit, setCodeHit] = useState<{
    code: string;
    title: string | null;
    plain: string | null;
  } | null>(null);

  async function decodeVin() {
    setVinBusy(true);
    setVinNote("");
    setVinSummary("");
    try {
      const res = await fetch("/api/vin/decode", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ vin: vin.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        enrichment?: {
          year?: string;
          make?: string;
          model?: string;
          trim?: string;
          engine?: string | null;
        } | null;
      };
      if (!res.ok) {
        setVinNote(data.detail ?? "The VIN could not be decoded. Please try again.");
        return;
      }
      const e = data.enrichment;
      const summary = e
        ? [e.year, e.make, e.model, e.trim].filter(Boolean).join(" ") +
          (e.engine ? `, ${e.engine}` : "")
        : "";
      if (summary.trim()) {
        setVinSummary(summary.trim());
      } else {
        // NHTSA didn't answer — the VIN still names the car; the
        // route's own words say what happened.
        setVinNote(data.detail ?? "");
      }
    } catch {
      setVinNote("The VIN could not be decoded. Please try again.");
    }
    setVinBusy(false);
  }

  function useVin() {
    const info = vinSummary || `VIN ${vin.trim().toUpperCase()}`;
    onVehicle(info);
    setUsing(info);
    setOpen(null);
  }

  const manualReady = year.trim() !== "" && make.trim() !== "" && model.trim() !== "";
  function useManual() {
    const head = [year.trim(), make.trim(), model.trim()].filter(Boolean).join(" ");
    const info =
      head +
      (engine.trim() ? `, ${engine.trim()}` : "") +
      (mileage.trim() ? `, ${mileage.trim()} miles` : "");
    onVehicle(info);
    setUsing(info);
    setOpen(null);
  }

  async function lookupCode() {
    setCodeBusy(true);
    setCodeError("");
    setCodeHit(null);
    try {
      const res = await fetch("/api/codes/lookup", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        code?: string;
        entry?: { title: string; plain: string } | null;
      };
      if (!res.ok || !data.code) {
        setCodeError(d.codeInvalid);
        return;
      }
      setCodeHit({
        code: data.code,
        title: data.entry?.title ?? null,
        plain: data.entry?.plain ?? null,
      });
    } catch {
      setCodeError(d.codeInvalid);
    }
    setCodeBusy(false);
  }

  function useCode() {
    if (!codeHit) return;
    onProblem(`Fault code ${codeHit.code}${codeHit.title ? ` — ${codeHit.title}` : ""}`);
    setOpen(null);
  }

  const inputClass =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1 placeholder:text-ink-3";
  const labelClass = "block text-sm font-medium text-ink-2";
  const doorButtonClass =
    "flex w-full items-center justify-between gap-3 px-5 py-4 text-left";
  const actionClass =
    "flex h-11 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60";
  const ghostClass =
    "flex h-11 items-center justify-center rounded-full border border-line bg-surface px-6 text-base font-semibold text-ink-1 disabled:opacity-60";

  function DoorHead({
    door,
    title,
  }: {
    door: "vin" | "manual" | "code";
    title: string;
  }) {
    const isOpen = open === door;
    return (
      <button
        type="button"
        className={doorButtonClass}
        aria-expanded={isOpen}
        onClick={() => setOpen(isOpen ? null : door)}
      >
        <span className="font-display text-base font-semibold text-ink-1">{title}</span>
        <span aria-hidden="true" className={"text-ink-3 transition-transform " + (isOpen ? "rotate-180" : "")}>
          ▾
        </span>
      </button>
    );
  }

  return (
    <div>
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
        <div>
          <DoorHead door="vin" title={d.vinTitle} />
          {open === "vin" && (
            <div className="flex flex-col gap-3 px-5 pb-5">
              <div>
                <label htmlFor="door-vin" className={labelClass}>
                  {d.vinLabel}
                </label>
                <input
                  id="door-vin"
                  className={inputClass + " mt-1.5 uppercase"}
                  placeholder={d.vinPlaceholder}
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {vinSummary && (
                <p className="text-base font-medium text-ink-1">{vinSummary}</p>
              )}
              {vinNote && <p className="text-sm leading-relaxed text-ink-2">{vinNote}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="button" className={ghostClass} disabled={vinBusy || vin.trim() === ""} onClick={() => void decodeVin()}>
                  {vinBusy ? d.vinDecoding : d.vinButton}
                </button>
                {(vinSummary || vinNote) && (
                  <button type="button" className={actionClass} onClick={useVin}>
                    {vinSummary ? d.useVehicle : d.vinUseAsEntered}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <DoorHead door="manual" title={d.manualTitle} />
          {open === "manual" && (
            <div className="flex flex-col gap-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="door-year" className={labelClass}>
                    {d.yearLabel}
                  </label>
                  <input id="door-year" className={inputClass + " mt-1.5"} inputMode="numeric" placeholder="2021" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="door-mileage" className={labelClass}>
                    {d.mileageLabel}
                  </label>
                  <input id="door-mileage" className={inputClass + " mt-1.5"} inputMode="numeric" placeholder={d.mileagePlaceholder} value={mileage} onChange={(e) => setMileage(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="door-make" className={labelClass}>
                    {d.makeLabel}
                  </label>
                  <input id="door-make" className={inputClass + " mt-1.5"} placeholder="Ford" value={make} onChange={(e) => setMake(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="door-model" className={labelClass}>
                    {d.modelLabel}
                  </label>
                  <input id="door-model" className={inputClass + " mt-1.5"} placeholder="F-150" value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label htmlFor="door-engine" className={labelClass}>
                    {d.engineLabel}
                  </label>
                  <input id="door-engine" className={inputClass + " mt-1.5"} placeholder={d.enginePlaceholder} value={engine} onChange={(e) => setEngine(e.target.value)} />
                </div>
              </div>
              <div>
                <button type="button" className={actionClass} disabled={!manualReady} onClick={useManual}>
                  {d.useVehicle}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <DoorHead door="code" title={d.codeTitle} />
          {open === "code" && (
            <div className="flex flex-col gap-3 px-5 pb-5">
              <div>
                <label htmlFor="door-code" className={labelClass}>
                  {d.codeLabel}
                </label>
                <input
                  id="door-code"
                  className={inputClass + " mt-1.5 uppercase"}
                  placeholder={d.codePlaceholder}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {codeError && (
                <p className="text-sm leading-relaxed text-ink-2" role="alert">
                  {codeError}
                </p>
              )}
              {codeHit && (
                <div>
                  <p className="text-base font-medium text-ink-1">
                    {codeHit.code}
                    {codeHit.title ? ` — ${codeHit.title}` : ""}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">
                    {codeHit.plain ?? d.codeNotCatalogued}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" className={ghostClass} disabled={codeBusy || code.trim() === ""} onClick={() => void lookupCode()}>
                  {codeBusy ? d.codeSearching : d.codeButton}
                </button>
                {codeHit && (
                  <button type="button" className={actionClass} onClick={useCode}>
                    {d.codeUse}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {using && (
        <p className="mt-3 text-sm text-ink-2" role="status">
          {d.usingLabel}: <span className="font-medium text-ink-1">{using}</span>
        </p>
      )}
    </div>
  );
}
