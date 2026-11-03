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
  mileage: number | null;
  nickname: string | null;
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
  const [form, setForm] = useState({
    year: "",
    make: "",
    model: "",
    trim: "",
    vin: "",
    mileage: "",
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
        mileage: form.mileage ? Number(form.mileage) : undefined,
        nickname: form.nickname || undefined,
      }),
    });
    if (res.status === 201) {
      setForm({ year: "", make: "", model: "", trim: "", vin: "", mileage: "", nickname: "" });
      setNotice(v.saved);
      await loadVehicles();
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
                    "flex min-h-12 w-full items-center rounded-xl border px-4 py-3 text-left text-base " +
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
                    <span className="ml-auto pl-3 font-mono text-sm text-ink-2">
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
          <h2 className="font-display text-xl font-semibold text-ink-1">{v.addTitle}</h2>
          <form onSubmit={onAdd} className="mt-4 flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="veh-year" className={labelCls}>{v.year}</label>
                <input id="veh-year" className={inputCls} inputMode="numeric" placeholder="2019"
                  value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required />
              </div>
              <div>
                <label htmlFor="veh-mileage" className={labelCls}>{v.mileage}</label>
                <input id="veh-mileage" className={inputCls} inputMode="numeric" placeholder="85000"
                  value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="veh-make" className={labelCls}>{v.make}</label>
              <input id="veh-make" className={inputCls} placeholder="Honda"
                value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="veh-model" className={labelCls}>{v.model}</label>
              <input id="veh-model" className={inputCls} placeholder="Accord"
                value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="veh-trim" className={labelCls}>{v.trim}</label>
                <input id="veh-trim" className={inputCls} placeholder="EX"
                  value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} />
              </div>
              <div>
                <label htmlFor="veh-nickname" className={labelCls}>{v.nickname}</label>
                <input id="veh-nickname" className={inputCls}
                  value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="veh-vin" className={labelCls}>{v.vin}</label>
              <input id="veh-vin" className={`${inputCls} font-mono`} placeholder="1HGCV1F34KA000000"
                value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
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
          </form>
        </section>
      </main>
    </>
  );
}
