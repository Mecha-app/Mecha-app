"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client/api";
import {
  OTHER_VEHICLE_VALUE,
  savedVehicleInfo,
  savedVehicleLabel,
  type SavedVehicle,
} from "@/lib/client/vehicles";

/**
 * SavedVehicleField (Pass 15, 2026-11-16) — the "Your car" field for
 * the signed-in diagnosis flows (/app/diagnose, /app/scan photo +
 * code). The owner's complaint: he had already saved his vehicle in
 * the Health Vault, yet the diagnose form still forced him to re-type
 * "Year, make, and model" into a blank box — and because the run never
 * named the vehicle, the diagnosis was never linked to it either.
 *
 * Behavior:
 *   - While the garage loads, a same-height placeholder stands in —
 *     the wrong control never flashes.
 *   - With ≥1 saved vehicle: a picker of the driver's own vehicles,
 *     the first (garage order — the dashboard's hero vehicle)
 *     pre-selected, plus an "Other vehicle…" option that reveals the
 *     free-text field (with a way back to the picker).
 *   - With 0 saved vehicles, or if the fetch fails: exactly the
 *     free-text field the forms always had — diagnosis never blocks
 *     on the garage.
 *   - A value the parent already holds (a scan handoff's typed text,
 *     or a picked vehicleId) wins over auto-selection: a prefilled
 *     string opens in text mode, a prefilled id opens in the picker.
 *
 * The parent owns the pair (vehicleInfo, vehicleId): picking a saved
 * vehicle reports its composed "year make model trim (engine)" string
 * — the same shape the API has always received — together with its id,
 * so the saved diagnosis record links to the vehicle. Typing reports
 * the text with a null id.
 */

interface SavedVehicleFieldProps {
  id: string;
  label: string;
  placeholder: string;
  /** The picker's escape hatch: "Other vehicle…" */
  otherOptionLabel: string;
  /** The way back from free text: "Use a saved vehicle" */
  savedOptionLabel: string;
  value: string;
  vehicleId: string | null;
  onChange: (vehicleInfo: string, vehicleId: string | null) => void;
  labelClassName?: string;
  inputClassName?: string;
}

const DEFAULT_LABEL_CLS = "block text-sm font-medium text-ink-2";
const DEFAULT_INPUT_CLS =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";

export default function SavedVehicleField({
  id,
  label,
  placeholder,
  otherOptionLabel,
  savedOptionLabel,
  value,
  vehicleId,
  onChange,
  labelClassName,
  inputClassName,
}: SavedVehicleFieldProps) {
  const labelCls = labelClassName ?? DEFAULT_LABEL_CLS;
  const inputCls = inputClassName ?? DEFAULT_INPUT_CLS;
  const [vehicles, setVehicles] = useState<SavedVehicle[] | null>(null);
  const [mode, setMode] = useState<"picker" | "text" | null>(null);

  // The decision (picker vs text, auto-select) reads the LATEST props
  // at the moment the fetch lands — a scan prefill applied by the
  // parent in the same mount must win over auto-selection.
  const propsRef = useRef({ value, vehicleId, onChange });
  propsRef.current = { value, vehicleId, onChange };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list: SavedVehicle[] = [];
      try {
        const res = await apiFetch<{ vehicles?: SavedVehicle[] }>("/api/vehicles");
        if (res.status === 200 && Array.isArray(res.data.vehicles)) {
          list = res.data.vehicles;
        }
      } catch {
        // Garage unreachable — fall through with an empty list, which
        // resolves to the free-text field. Never block the diagnosis.
        list = [];
      }
      if (cancelled) return;
      setVehicles(list);
      const current = propsRef.current;
      if (list.length === 0) {
        setMode("text");
      } else if (current.vehicleId && list.some((v) => v.id === current.vehicleId)) {
        setMode("picker");
      } else if (current.value.trim().length > 0) {
        setMode("text");
      } else {
        setMode("picker");
        current.onChange(savedVehicleInfo(list[0]), list[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickSaved(vehicle: SavedVehicle) {
    setMode("picker");
    onChange(savedVehicleInfo(vehicle), vehicle.id);
  }

  function pickOther() {
    setMode("text");
    onChange("", null);
  }

  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {vehicles === null || mode === null ? (
        // Loading: a same-height stand-in, never the wrong control.
        <div className={`${inputCls} animate-pulse`} aria-busy="true" aria-hidden="true" />
      ) : mode === "picker" && vehicles.length > 0 ? (
        <select
          id={id}
          className={inputCls}
          value={vehicleId ?? vehicles[0].id}
          onChange={(e) => {
            if (e.target.value === OTHER_VEHICLE_VALUE) {
              pickOther();
            } else {
              const vehicle = vehicles.find((v) => v.id === e.target.value);
              if (vehicle) pickSaved(vehicle);
            }
          }}
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {savedVehicleLabel(vehicle)}
            </option>
          ))}
          <option value={OTHER_VEHICLE_VALUE}>{otherOptionLabel}</option>
        </select>
      ) : (
        <>
          <input
            id={id}
            className={inputCls}
            placeholder={placeholder}
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value, null)}
          />
          {vehicles.length > 0 && (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-accent"
              onClick={() => {
                const vehicle =
                  vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];
                pickSaved(vehicle);
              }}
            >
              {savedOptionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
