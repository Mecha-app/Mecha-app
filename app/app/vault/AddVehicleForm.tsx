"use client";

import { useState, type FormEvent } from "react";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { vehicleFormFillFromDecode, type VinDecodeFill } from "@/lib/client/vehicles";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Add Vehicle (Pass 16) — the ONE add-a-vehicle form, shared by the
 * Health Vault page and its post-registration welcome mode. Two
 * paths in one form, no extra screens (owner: "I don't want too
 * many distractions"):
 *   1. VIN path (primary) — type or paste the VIN, tap Fill from
 *      VIN, and year / make / model / trim / engine (cylinders
 *      included) fill from the NHTSA vPIC decode the server already
 *      runs; the driver reviews and edits before saving. Mileage is
 *      always the driver's to enter — the decoder can't know it.
 *   2. Manual path — the same fields typed in, always right there
 *      below; nothing about the VIN path gates them.
 * A VIN the decoder can't read, or a lookup that doesn't answer,
 * shows one calm inline note and leaves every field editable —
 * saving a vehicle is never blocked by the decoder.
 *
 * The component lives in the signed-in app tree (not components/)
 * on purpose: it calls /api/vin/decode, and diagnosis-execution
 * APIs are only ever called from inside app/app/ — the public
 * surface inventory test pins that rule.
 */

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
const labelCls = "block text-sm font-medium text-ink-2";

const EMPTY_FORM = {
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
};

export default function AddVehicleForm({
  welcome = false,
  onSaved,
}: {
  welcome?: boolean;
  onSaved?: () => void;
}) {
  const { t } = useLocale();
  const v = t.wp6.vault;
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [prefilling, setPrefilling] = useState(false);
  const [vinNote, setVinNote] = useState<"" | "invalid" | "unavailable">("");

  /** The server's normalizeVin rule, mirrored so a bad VIN gets its
   * note instantly without a round trip: uppercase alphanumerics,
   * 11–17 characters. */
  function vinShapeOk(raw: string): boolean {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned.length >= 11 && cleaned.length <= 17;
  }

  async function onFillFromVin() {
    if (!vinShapeOk(form.vin)) {
      setVinNote("invalid");
      return;
    }
    setPrefilling(true);
    setVinNote("");
    setNotice("");
    const res = await apiFetch<{ enrichment: VinDecodeFill | null }>("/api/vin/decode", {
      method: "POST",
      body: JSON.stringify({ vin: form.vin }),
    });
    setPrefilling(false);
    if (res.status === 200 && res.data.enrichment) {
      const fill = vehicleFormFillFromDecode(res.data.enrichment);
      setForm((f) => ({
        ...f,
        year: fill.year || f.year,
        make: fill.make || f.make,
        model: fill.model || f.model,
        trim: fill.trim || f.trim,
        engine: fill.engine || f.engine,
      }));
      setNotice(v.prefilledNote);
    } else if (res.status === 400) {
      // The server could not read the VIN itself.
      setVinNote("invalid");
    } else {
      // The decode ran but the database didn't answer (the route's
      // 200 with enrichment: null), or the lookup failed outright.
      setVinNote("unavailable");
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await apiFetch<{ vehicle: { id: string } }>("/api/vehicles", {
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
      setForm(EMPTY_FORM);
      setVinNote("");
      setNotice(v.saved);
      onSaved?.();
    } else {
      setError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  return (
    <form onSubmit={onAdd} className="mt-4 flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="veh-vin" className={labelCls}>{v.vin}</label>
        <input
          id="veh-vin"
          className={`${inputCls} font-mono`}
          placeholder="Enter VIN number"
          value={form.vin}
          onChange={(e) => {
            setForm({ ...form, vin: e.target.value });
            setVinNote("");
          }}
        />
        <p className="mt-2 text-sm text-ink-3">{v.vinFillHint}</p>
        <button
          type="button"
          onClick={() => void onFillFromVin()}
          disabled={prefilling}
          className="mt-3 flex h-12 items-center rounded-full border border-line px-5 text-base font-semibold text-ink-1 disabled:opacity-60"
        >
          {prefilling ? v.decoding : v.prefillFromVin}
        </button>
        {vinNote && (
          <p className="mt-3 rounded-xl bg-inset px-4 py-3 text-base text-ink-2" role="status">
            {vinNote === "invalid" ? v.vinFillInvalid : v.vinFillUnavailable}
          </p>
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
  );
}
