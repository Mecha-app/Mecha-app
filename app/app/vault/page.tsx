"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AddVehicleForm from "./AddVehicleForm";
import MaintenanceSection from "@/components/MaintenanceSection";
import { AppNav } from "@/components/AppNav";
import { apiFetch } from "@/lib/client/api";
import { getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app/vault — the Health Vault (WP6): the driver's vehicles, each
 * with its identity (year/make/model/trim/VIN/mileage) and the
 * diagnosis history attached to it. VIN lookup runs through the
 * server (NHTSA vPIC + recalls), never from the browser directly.
 * Adding a vehicle is the shared AddVehicleForm (Pass 16): the VIN
 * path fills the form from the decode, the manual path is the same
 * fields typed in. Mobile-first, one column, ≥48px targets.
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

interface ComplaintsResult {
  count: number;
  topComponents: string[];
  recent: { component: string | null; summary: string | null }[];
}

interface SafetyRatings {
  vehicleDescription: string | null;
  overall: number | null;
  frontal: number | null;
  side: number | null;
  rollover: number | null;
}

function stars(rating: number | null): string {
  if (rating === null) return "—";
  return `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))} ${rating}/5`;
}

export default function VaultPage() {
  const { t } = useLocale();
  const v = t.wp6.vault;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  // First-load gates (Pass #20b): until the first fetch resolves the
  // page shows a loading state — never the empty add form, and the
  // history's empty copy waits for a completed fetch too.
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [recalls, setRecalls] = useState<Recall[] | null>(null);
  const [complaints, setComplaints] = useState<ComplaintsResult | null>(null);
  const [safetyRatings, setSafetyRatings] = useState<SafetyRatings | null>(null);
  const [recallsState, setRecallsState] = useState<"idle" | "working" | "done" | "failed">("idle");
  // Post-registration onboarding (?welcome=1): the same add form,
  // presented as "Add your first vehicle" with a Skip — never a trap.
  const [welcome, setWelcome] = useState(false);

  const loadVehicles = useCallback(async () => {
    try {
      const res = await apiFetch<{ vehicles: Vehicle[] }>("/api/vehicles");
      if (res.status === 200) setVehicles(res.data.vehicles);
    } finally {
      setVehiclesLoaded(true);
    }
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
    setComplaints(null);
    setSafetyRatings(null);
    setRecallsState("idle");
    // A fresh vehicle's history starts empty AND loading — the
    // previous vehicle's entries (or the empty copy) must never
    // paint for this one (Pass #20b).
    setDiagnoses([]);
    setHistoryLoading(true);
    try {
      const res = await apiFetch<{ diagnoses: Diagnosis[] }>(`/api/vehicles/${vehicle.id}`);
      if (res.status === 200) setDiagnoses(res.data.diagnoses);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function onDecode() {
    if (!selected?.vin) return;
    setRecallsState("working");
    const res = await apiFetch<{
      recalls: Recall[] | null;
      complaints: ComplaintsResult | null;
      safetyRatings: SafetyRatings | null;
    }>(`/api/vin/decode`, {
      method: "POST",
      body: JSON.stringify({ vin: selected.vin }),
    });
    if (res.status === 200 && Array.isArray(res.data.recalls)) {
      setRecalls(res.data.recalls);
      setComplaints(res.data.complaints);
      setSafetyRatings(res.data.safetyRatings);
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

        {!vehiclesLoaded && (
          <p className="mt-6 text-base text-ink-2" role="status">
            Loading…
          </p>
        )}

        {vehiclesLoaded && vehicles.length > 0 && (
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

        {vehiclesLoaded && selected && (
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
                {recallsState === "done" && safetyRatings && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                      {v.safetyTitle}
                    </h3>
                    <dl className="mt-2 flex flex-col gap-2 text-base">
                      {(
                        [
                          [v.safetyOverall, safetyRatings.overall],
                          [v.safetyFrontal, safetyRatings.frontal],
                          [v.safetySide, safetyRatings.side],
                          [v.safetyRollover, safetyRatings.rollover],
                        ] as const
                      )
                        .filter(([, value]) => value !== null)
                        .map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-4">
                            <dt className="text-ink-3">{label}</dt>
                            <dd className="text-ink-1">{stars(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}
                {recallsState === "done" && complaints && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                      {v.complaintsTitle}
                    </h3>
                    {complaints.count === 0 ? (
                      <p className="mt-2 text-base text-ink-2">{v.noComplaints}</p>
                    ) : (
                      <>
                        <p className="mt-2 text-base text-ink-2">
                          {v.complaintsCount.replace("{count}", String(complaints.count))}
                        </p>
                        {complaints.topComponents.length > 0 && (
                          <p className="mt-1 text-base text-ink-2">
                            {v.complaintsTop.replace("{components}", complaints.topComponents.join(", "))}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {v.historyTitle}
            </h3>
            {historyLoading ? (
              <p className="mt-2 text-base text-ink-2" role="status">
                Loading…
              </p>
            ) : diagnoses.length === 0 ? (
              <p className="mt-2 text-base text-ink-2">{v.noHistory}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {diagnoses.map((diag) => (
                  <li key={diag.id}>
                    {/* Every entry opens its saved diagnosis
                        (Pass #20b) — the detail view carries the
                        share link and the outcome prompt for this
                        run, and shows this record's own range. */}
                    <Link
                      href={`/app/diagnoses/${diag.id}`}
                      className="block rounded-xl bg-inset px-4 py-3 transition-colors hover:bg-raised"
                    >
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
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Maintenance reminders (Pass #20) — from this vehicle's
                own mileage and the driver's last-done marks. */}
            <MaintenanceSection vehicleId={selected.id} />

            <button
              type="button"
              onClick={() => void onDelete()}
              className="mt-6 flex h-12 items-center rounded-full px-5 text-base font-semibold text-verdict-rip"
            >
              {v.removeVehicle}
            </button>
          </section>
        )}

        {vehiclesLoaded && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink-1">
            {welcome ? v.firstTitle : v.addTitle}
          </h2>
          {welcome && <p className="mt-2 text-base leading-relaxed text-ink-2">{v.firstBody}</p>}
          <p className="mt-2 text-sm text-ink-3">{v.requiredNote}</p>
          <AddVehicleForm
            welcome={welcome}
            onSaved={() => {
              setWelcome(false);
              void loadVehicles();
            }}
          />
        </section>
        )}
      </main>
    </>
  );
}
