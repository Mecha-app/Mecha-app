"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app/vault — the Health Vault (WP6): the driver's vehicles, each
 * with its identity (year/make/model/trim/VIN/mileage) and the
 * diagnosis history attached to it. VIN lookup runs through the
 * server (NHTSA vPIC + recalls), never from the browser directly.
 * Mobile-first, one column, ≥48px targets.
 */

interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  engine: string | null;
  mileage: number | null;
  color: string | null;
  licensePlate: string | null;
  nickname: string | null;
}

interface VinEnrichment {
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
}

interface Diagnosis {
  id: string;
  problemText: string | null;
  createdAt: string;
  aiResult: {
    severity?: string;
    diagnosis?: string;
    estimatedCost?: { min: number; max: number };
  } | null;
}

interface Recall {
  component: string | null;
  summary: string | null;
}

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
const labelCls = "block text-sm font-medium text-ink-2";

export default function VaultPage() {
  const { t } = useLocale();
  const v = t.wp6.vault;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [recalls, setRecalls] = useState<Recall[] | null>(null);
  const [recallsState, setRecallsState] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Post-registration onboarding (?welcome=1): the same add form,
  // presented as "Add your first vehicle" with a Skip — never a trap.
  const [welcome, setWelcome] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [form, setForm] = useState({
    year: "",
    make: "",
    model: "",
    trim: "",
    vin: "",
    engine: "",
    mileage: "",
    color: "",
    licensePlate: "",
    nickname: "",
  });

  const loadVehicles = useCallback(async () => {
    const res = await apiFetch<{ vehicles: Vehicle[] }>("/api/vehicles");
    if (res.status === 200) setVehicles(res.data.vehicles);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    if (new URLSearchParams(window.location.search).get("welcome") === "1") {
      setWelcome(true);
    }
    void loadVehicles();
  }, [loadVehicles]);

  async function openVehicle(vehicle: Vehicle) {
    setSelected(vehicle);
    setRecalls(null);
    setRecallsState("idle");
    setNotice("");
    const res = await apiFetch<{ diagnoses: Diagnosis[] }>(`/api/vehicles/${vehicle.id}`);
    if (res.status === 200) setDiagnoses(res.data.diagnoses);
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch<{ vehicle: Vehicle }>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify({
        year: form.year,
        make: form.make,
        model: form.model,
        trim: form.trim || undefined,
        vin: form.vin || undefined,
        engine: form.engine,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        color: form.color || undefined,
        licensePlate: form.licensePlate || undefined,
        nickname: form.nickname || undefined,
      }),
    });
    if (res.status === 201) {
      setForm({
        year: "",
        make: "",
        model: "",
        trim: "",
        vin: "",
        engine: "",
        mileage: "",
        color: "",
        licensePlate: "",
        nickname: "",
      });
      setNotice(v.saved);
      setWelcome(false);
      await loadVehicles();
    } else {
      setError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  /**
   * VIN prefill (owner spec): when a VIN is typed and NHTSA decode
   * data exists, year/make/model/trim/engine fill from the decode —
   * the owner checks them over; mileage is always theirs to enter.
   */
  async function onPrefillFromVin() {
    if (form.vin.trim().length < 11) return;
    setPrefilling(true);
    setError("");
    const res = await apiFetch<{ enrichment: VinEnrichment | null }>(`/api/vin/decode`, {
      method: "POST",
      body: JSON.stringify({ vin: form.vin }),
    });
    setPrefilling(false);
    if (res.status === 200 && res.data.enrichment) {
      const d = res.data.enrichment;
      setForm((f) => ({
        ...f,
        year: d.year ?? f.year,
        make: d.make ?? f.make,
        model: d.model ?? f.model,
        trim: d.trim ?? f.trim,
        engine: d.engine ?? f.engine,
      }));
      setNotice(v.prefilledNote);
    } else {
      setError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  async function onDecode() {
    if (!selected?.vin) return;
    setRecallsState("working");
    const res = await apiFetch<{ recalls: Recall[] | null }>(`/api/vin/decode`, {
      method: "POST",
      body: JSON.stringify({ vin: selected.vin }),
    });
    if (res.status === 200 && Array.isArray(res.data.recalls)) {
      setRecalls(res.data.recalls);
      setRecallsState("done");
    } else {
      setRecallsState("failed");
    }
  }

  async function onDelete() {
    if (!selected) return;
    if (!window.confirm(v.removeConfirm)) return;
    const res = await apiFetch(`/api/vehicles/${selected.id}`, { method: "DELETE" });
    if (res.status === 200) {
      setSelected(null);
      setDiagnoses([]);
      await loadVehicles();
    }
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {v.title}
        </h1>
        <p className="mt-1 text-base text-ink-2">{v.subtitle}</p>

        {vehicles.length > 0 && (
          <ul className="mt-6 flex flex-col gap-2">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <button
                  type="button"
                  onClick={() => void openVehicle(vehicle)}
                  className={
                    "flex min-h-12 w-full items-center rounded-xl border px-4 py-3 text-start text-base " +
                    (selected?.id === vehicle.id
                      ? "border-accent bg-surface text-ink-1"
                      : "border-line bg-surface text-ink-1")
                  }
                >
                  <span className="font-medium">
                    {vehicle.nickname ? `${vehicle.nickname} — ` : ""}
                    {vehicle.year} {vehicle.make} {vehicle.model}
                    {vehicle.trim ? ` ${vehicle.trim}` : ""}
                  </span>
                  {vehicle.mileage !== null && (
                    <span className="ms-auto ps-3 font-mono text-sm text-ink-2">
                      {vehicle.mileage.toLocaleString()} mi
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-5">
            <h2 className="font-display text-xl font-semibold text-ink-1">
              {selected.year} {selected.make} {selected.model}
              {selected.trim ? ` ${selected.trim}` : ""}
            </h2>
            {(selected.engine || selected.color || selected.licensePlate) && (
              <p className="mt-2 text-base text-ink-2">
                {[selected.engine, selected.color, selected.licensePlate]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {selected.vin && (
              <>
                <p className="mt-2 font-mono text-base text-ink-2">
                  {v.vin}: {selected.vin}
                </p>
                <button
                  type="button"
                  onClick={() => void onDecode()}
                  disabled={recallsState === "working"}
                  className="mt-3 flex h-12 items-center rounded-full border border-line px-5 text-base font-semibold text-ink-1 disabled:opacity-60"
                >
                  {recallsState === "working" ? v.decoding : v.decodeVin}
                </button>
                {recallsState === "done" && recalls && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                      {v.recallsTitle}
                    </h3>
                    {recalls.length === 0 ? (
                      <p className="mt-2 text-base text-ink-2">{v.noRecalls}</p>
                    ) : (
                      <ul className="mt-2 flex flex-col gap-2">
                        {recalls.map((r, i) => (
                          <li key={i} className="rounded-xl bg-inset px-4 py-3 text-base text-ink-1">
                            <span className="font-medium">{r.component ?? "Recall"}</span>
                            {r.summary && (
                              <span className="mt-1 block text-sm leading-relaxed text-ink-2">
                                {r.summary}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {recallsState === "failed" && (
                  <p className="mt-3 text-base text-ink-2">{v.recallsUnavailable}</p>
                )}
              </>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {v.historyTitle}
            </h3>
            {diagnoses.length === 0 ? (
              <p className="mt-2 text-base text-ink-2">{v.noHistory}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {diagnoses.map((diag) => (
                  <li key={diag.id} className="rounded-xl bg-inset px-4 py-3">
                    <span className="text-sm text-ink-2">
                      {new Date(diag.createdAt).toLocaleDateString()}
                      {diag.aiResult?.severity ? ` · ${diag.aiResult.severity}` : ""}
                    </span>
                    <span className="mt-1 block text-base text-ink-1">
                      {diag.aiResult?.diagnosis ?? diag.problemText ?? ""}
                    </span>
                    {diag.aiResult?.estimatedCost && (
                      <span className="mt-1 block font-mono text-sm text-ink-2">
                        ${diag.aiResult.estimatedCost.min}–${diag.aiResult.estimatedCost.max}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => void onDelete()}
              className="mt-6 flex h-12 items-center rounded-full px-5 text-base font-semibold text-verdict-rip"
            >
              {v.removeVehicle}
            </button>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink-1">
            {welcome ? v.firstTitle : v.addTitle}
          </h2>
          {welcome && <p className="mt-2 text-base leading-relaxed text-ink-2">{v.firstBody}</p>}
          <p className="mt-2 text-sm text-ink-3">{v.requiredNote}</p>
          <form onSubmit={onAdd} className="mt-4 flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="veh-vin" className={labelCls}>{v.vin}</label>
              <input id="veh-vin" className={`${inputCls} font-mono`} placeholder="Enter VIN number"
                value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
              {form.vin.trim().length >= 11 && (
                <button
                  type="button"
                  onClick={() => void onPrefillFromVin()}
                  disabled={prefilling}
                  className="mt-3 flex h-12 items-center rounded-full border border-line px-5 text-base font-semibold text-ink-1 disabled:opacity-60"
                >
                  {prefilling ? v.decoding : v.prefillFromVin}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="veh-year" className={labelCls}>{v.year}</label>
                <input id="veh-year" className={inputCls} inputMode="numeric" placeholder="Enter year"
                  value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="veh-mileage" className={labelCls}>{v.mileage}</label>
                <input id="veh-mileage" className={inputCls} inputMode="numeric" placeholder="Enter current mileage"
                  value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} required />
              </div>
            </div>
            <div>
              <label htmlFor="veh-make" className={labelCls}>{v.make}</label>
              <input id="veh-make" className={inputCls} placeholder="Enter make"
                value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="veh-model" className={labelCls}>{v.model}</label>
              <input id="veh-model" className={inputCls} placeholder="Enter model"
                value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="veh-engine" className={labelCls}>{v.engine}</label>
              <input id="veh-engine" className={inputCls} placeholder={v.enginePlaceholder}
                value={form.engine} onChange={(e) => setForm({ ...form, engine: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="veh-trim" className={labelCls}>{v.trim}</label>
                <input id="veh-trim" className={inputCls} placeholder="Enter trim"
                  value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} />
              </div>
              <div>
                <label htmlFor="veh-nickname" className={labelCls}>{v.nickname}</label>
                <input id="veh-nickname" className={inputCls}
                  value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="veh-color" className={labelCls}>{v.color}</label>
                <input id="veh-color" className={inputCls} placeholder="Enter color"
                  value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div>
                <label htmlFor="veh-plate" className={labelCls}>{v.licensePlate}</label>
                <input id="veh-plate" className={`${inputCls} font-mono`}
                  value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
              </div>
            </div>
            {error && (
              <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="text-base text-verdict-fair" role="status">{notice}</p>}
            <button
              type="submit"
              className="h-14 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              {v.addButton}
            </button>
            {welcome && (
              <a
                href="/app/diagnose"
                className="flex h-12 w-full items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
              >
                {v.skipFirst}
              </a>
            )}
          </form>
        </section>
      </main>
    </>
  );
}
