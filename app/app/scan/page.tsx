"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { authHeaders, clearSession, getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import {
  DIAGNOSE_PREFILL_KEY,
  RETURN_TO_KEY,
  buildCodeDiagnosisPrefill,
  buildPhotoDiagnosisPrefill,
  buildVinDiagnosisPrefill,
  buildVinVehicleInfo,
  faultCodeInfo,
  validateFaultCode,
  type IdentifiedLight,
  type LightSeverity,
  type ScanDiagnosePrefill,
} from "@/lib/server/scan";

/**
 * /app/scan (blueprint route 13, Scan package) — the authenticated
 * scan flow, mobile-first: start from what the car is already showing
 * you. Three modes:
 *
 *   VIN   → decode through /api/vin/decode (NHTSA, server-side), show
 *           the vehicle card + open recalls; hand off to a diagnosis
 *           with the car prefilled, or save the car to the vault.
 *   Photo → dashboard photo to /api/scan/photo (vision through the
 *           provider layer) → lights identified + explained. Triage:
 *           NO quota is consumed here, ever.
 *   Code  → OBD code, format-validated instantly, explained by
 *           handing off to the diagnosis with the problem prefilled.
 *
 * QUOTA INTEGRITY: this page never consumes a diagnosis. Every
 * handoff writes a prefill and navigates to /app/diagnose, whose
 * /api/diagnose call runs the one consume path in diagnoseService —
 * exactly one consume, countdown shown, exhausted identities blocked
 * there exactly as always. No side doors.
 *
 * Unauthenticated visitors bounce to /login with a return-to saved,
 * so signing in (or registering, via the login page's link) lands
 * back here — the diagnose page's pattern, plus the return path.
 */

interface MeResponse {
  user: { id: string; name: string; plan: string };
  quota: { remaining: number | null; message?: string };
  message: string;
}

interface VinDecodeResult {
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
}

interface Recall {
  component: string | null;
  summary: string | null;
}

interface PhotoResult {
  lights: IdentifiedLight[];
  odometerMiles: number | null;
  note: string;
  disclaimer: string;
}

type Mode = "vin" | "photo" | "code";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
const labelCls = "block text-sm font-medium text-ink-2";
const primaryBtn =
  "inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60 sm:w-auto";
const ghostBtn =
  "inline-flex h-12 w-full items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1 disabled:opacity-60 sm:w-auto";

const SEVERITY_TEXT: Record<LightSeverity, string> = {
  Critical: "text-verdict-rip",
  "Moderate — Fix Soon": "text-verdict-warn",
  "Minor — Monitor": "text-verdict-fair",
};

function handoffToDiagnose(prefill: ScanDiagnosePrefill): void {
  try {
    sessionStorage.setItem(DIAGNOSE_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // Private mode — the diagnose page simply opens unfilled.
  }
  window.location.href = "/app/diagnose";
}

export default function ScanPage() {
  const { t } = useLocale();
  const s = t.scan.app;
  const [me, setMe] = useState<MeResponse | null>(null);
  const [mode, setMode] = useState<Mode>("vin");

  /* VIN mode state */
  const [vin, setVin] = useState("");
  const [vinPhotoUrl, setVinPhotoUrl] = useState<string | null>(null);
  const [decodeState, setDecodeState] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [decoded, setDecoded] = useState<VinDecodeResult | null>(null);
  const [recalls, setRecalls] = useState<Recall[] | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "working" | "saved" | "failed" | "unwired">(
    "idle",
  );
  const [saveDetail, setSaveDetail] = useState("");
  /* The vault's required fields the decode cannot know: the current
   * mileage is always the driver's to enter; the engine prefills from
   * the decode when NHTSA provides one and is typed otherwise. */
  const [saveMileage, setSaveMileage] = useState("");
  const [saveEngine, setSaveEngine] = useState("");

  /* Photo mode state */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<
    "idle" | "working" | "done" | "unwired" | "failed"
  >("idle");
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null);
  const [photoVehicle, setPhotoVehicle] = useState("");

  /* Code mode state */
  const [code, setCode] = useState("");
  const [codeVehicle, setCodeVehicle] = useState("");
  const normalizedCode = code.trim() ? validateFaultCode(code) : null;
  const codeInfo = normalizedCode ? faultCodeInfo(normalizedCode) : null;

  useEffect(() => {
    // Remember where auth should return to — set BEFORE any call that
    // might 401, so the bounce lands back on this page.
    try {
      sessionStorage.setItem(RETURN_TO_KEY, "/app/scan");
    } catch {
      // Private mode — return path simply won't persist.
    }
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    void (async () => {
      const res = await apiFetch<MeResponse>("/api/auth/me");
      if (res.status === 200) setMe(res.data);
    })();
  }, []);

  /* ------------------------------ VIN ------------------------------ */

  function onVinPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setVinPhotoUrl(file ? URL.createObjectURL(file) : null);
  }

  async function onDecode() {
    setDecodeState("working");
    setSaveState("idle");
    const res = await apiFetch<{
      enrichment: VinDecodeResult | null;
      recalls: Recall[] | null;
    }>("/api/vin/decode", { method: "POST", body: JSON.stringify({ vin }) });
    if (res.status === 200 && res.data.enrichment) {
      setDecoded(res.data.enrichment);
      setRecalls(res.data.recalls);
      setSaveEngine(res.data.enrichment.engine ?? "");
      setDecodeState("done");
    } else {
      setDecoded(null);
      setRecalls(null);
      setDecodeState("failed");
    }
  }

  async function onSaveVehicle() {
    if (!decoded) return;
    // The add-vehicle spec (owner): engine + current mileage are
    // required — the form enforces before the server has to.
    if (!saveEngine.trim() || !saveMileage.trim() || Number(saveMileage) < 0) {
      setSaveDetail(s.saveNeedsDetail);
      setSaveState("failed");
      return;
    }
    setSaveState("working");
    const res = await apiFetch("/api/vehicles", {
      method: "POST",
      body: JSON.stringify({
        year: decoded.year ?? undefined,
        make: decoded.make ?? undefined,
        model: decoded.model ?? undefined,
        trim: decoded.trim || undefined,
        vin: decoded.vin,
        engine: saveEngine.trim(),
        mileage: Number(saveMileage),
      }),
    });
    if (res.status === 201) {
      setSaveState("saved");
    } else if (res.status === 501) {
      setSaveState("unwired");
    } else {
      setSaveDetail(apiDetail(res.data, s.saveFailed));
      setSaveState("failed");
    }
  }

  /* ----------------------------- Photo ----------------------------- */

  function onPhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoUrl(file ? URL.createObjectURL(file) : null);
    setPhotoState("idle");
    setPhotoResult(null);
  }

  async function onIdentify() {
    if (!photoFile) return;
    setPhotoState("working");
    const form = new FormData();
    form.set("photo", photoFile);
    let res: Response;
    try {
      res = await fetch("/api/scan/photo", {
        method: "POST",
        headers: { ...authHeaders() },
        body: form,
      });
    } catch {
      setPhotoState("failed");
      return;
    }
    if (res.status === 401) {
      clearSession();
      window.location.href = "/login";
      return;
    }
    if (res.status === 501) {
      setPhotoState("unwired");
      return;
    }
    if (!res.ok) {
      setPhotoState("failed");
      return;
    }
    const data = (await res.json()) as PhotoResult & { status: string };
    setPhotoResult(data);
    setPhotoState("done");
  }

  /* ----------------------------- Render ---------------------------- */

  const tabs: Array<{ id: Mode; label: string }> = [
    { id: "vin", label: s.tabVin },
    { id: "photo", label: s.tabPhoto },
    { id: "code", label: s.tabCode },
  ];

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {s.title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-2">{s.intro}</p>

        {me && (
          <div className="mt-5 rounded-2xl border border-line bg-surface px-4 py-3">
            <p className="text-base font-medium text-ink-1" role="status">
              {me.message}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.freeNote}</p>
          </div>
        )}

        {/* Mode tabs — ≥48px targets, thumb-reachable. */}
        <div
          className="mt-6 flex gap-1 rounded-full border border-line bg-surface p-1"
          role="tablist"
          aria-label={s.title}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => setMode(tab.id)}
              className={
                "h-12 flex-1 rounded-full px-2 text-sm font-semibold sm:text-base " +
                (mode === tab.id ? "bg-accent text-accent-ink" : "text-ink-2")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ------------------------- VIN mode ------------------------- */}
        {mode === "vin" && (
          <section className="mt-6 flex flex-col gap-5">
            <div>
              <label htmlFor="scan-vin" className={labelCls}>
                {s.vinLabel}
              </label>
              <input
                id="scan-vin"
                className={inputCls + " font-mono uppercase"}
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                maxLength={17}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="1HGCV1F34KA…"
              />
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.vinHint}</p>
            </div>

            <div>
              <span className={labelCls}>{s.vinPhotoLabel}</span>
              <label className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-base font-medium text-ink-1">
                {s.vinPhotoLabel}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onVinPhoto}
                />
              </label>
              {vinPhotoUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vinPhotoUrl}
                    alt={s.vinPhotoLabel}
                    className="mt-3 w-full rounded-xl border border-line"
                  />
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.vinPhotoHint}</p>
                </>
              )}
            </div>

            <div>
              <button
                type="button"
                className={primaryBtn}
                disabled={decodeState === "working" || vin.trim().length < 11}
                onClick={() => void onDecode()}
              >
                {decodeState === "working" ? s.decoding : s.decodeCta}
              </button>
            </div>

            {decodeState === "failed" && (
              <p
                className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip"
                role="alert"
              >
                {s.decodeFailed}
              </p>
            )}

            {decodeState === "done" && decoded && (
              <div className="rounded-2xl border border-line bg-surface px-5 py-5">
                <h2 className="font-display text-2xl font-semibold text-ink-1">
                  {buildVinVehicleInfo(decoded)}
                </h2>
                <dl className="mt-4 flex flex-col gap-2 text-base">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-3">VIN</dt>
                    <dd className="font-mono text-sm leading-6 text-ink-1">{decoded.vin}</dd>
                  </div>
                  {decoded.trim && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-3">Trim</dt>
                      <dd className="text-ink-1">{decoded.trim}</dd>
                    </div>
                  )}
                  {decoded.engine && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-3">Engine</dt>
                      <dd className="text-right text-ink-1">{decoded.engine}</dd>
                    </div>
                  )}
                </dl>

                <h3 className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                  {s.recallsHeading}
                </h3>
                {recalls === null ? (
                  <p className="mt-2 text-base leading-relaxed text-ink-2">
                    {s.recallsUnavailable}
                  </p>
                ) : recalls.length === 0 ? (
                  <p className="mt-2 text-base leading-relaxed text-ink-2">{s.recallsNone}</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-3">
                    {recalls.map((recall, i) => (
                      <li key={i} className="rounded-xl bg-inset px-4 py-3">
                        <p className="text-base font-semibold text-verdict-warn">
                          {recall.component ?? s.recallsHeading}
                        </p>
                        {recall.summary && (
                          <p className="mt-1 text-sm leading-relaxed text-ink-2">
                            {recall.summary}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="scan-save-mileage" className="block text-sm font-medium text-ink-2">
                      {s.saveMileage}
                    </label>
                    <input
                      id="scan-save-mileage"
                      className={inputCls}
                      inputMode="numeric"
                      placeholder={s.saveMileagePlaceholder}
                      value={saveMileage}
                      onChange={(e) => setSaveMileage(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="scan-save-engine" className="block text-sm font-medium text-ink-2">
                      {s.saveEngine}
                    </label>
                    <input
                      id="scan-save-engine"
                      className={inputCls}
                      placeholder={s.saveEnginePlaceholder}
                      value={saveEngine}
                      onChange={(e) => setSaveEngine(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    className={primaryBtn}
                    onClick={() => handoffToDiagnose(buildVinDiagnosisPrefill(decoded))}
                  >
                    {s.diagnoseCarCta}
                  </button>
                  <button
                    type="button"
                    className={ghostBtn}
                    disabled={saveState === "working" || saveState === "saved"}
                    onClick={() => void onSaveVehicle()}
                  >
                    {saveState === "saved" ? s.savedVault : s.saveVaultCta}
                  </button>
                </div>
                {saveState === "saved" && (
                  <p className="mt-3 text-base text-ink-1" role="status">
                    {s.savedVault}{" "}
                    <Link href="/app/vault" className="font-semibold text-accent underline">
                      {s.viewVault}
                    </Link>
                  </p>
                )}
                {saveState === "unwired" && (
                  <p className="mt-3 text-base text-ink-2" role="status">
                    {s.vaultUnwired}
                  </p>
                )}
                {saveState === "failed" && (
                  <p className="mt-3 text-base text-verdict-rip" role="alert">
                    {saveDetail}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ------------------------ Photo mode ------------------------ */}
        {mode === "photo" && (
          <section className="mt-6 flex flex-col gap-5">
            <div>
              <span className={labelCls}>{s.photoLabel}</span>
              <label className="mt-1 flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-center text-base font-medium text-ink-1">
                {s.photoLabel}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={onPhotoPick}
                />
              </label>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.photoHint}</p>
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={s.photoLabel}
                  className="mt-3 w-full rounded-xl border border-line"
                />
              )}
            </div>

            <div>
              <label htmlFor="scan-photo-vehicle" className={labelCls}>
                {s.vehicleOptionalLabel}
              </label>
              <input
                id="scan-photo-vehicle"
                className={inputCls}
                value={photoVehicle}
                onChange={(e) => setPhotoVehicle(e.target.value)}
                placeholder={s.vehicleOptionalPlaceholder}
                autoComplete="off"
              />
            </div>

            <div>
              <button
                type="button"
                className={primaryBtn}
                disabled={!photoFile || photoState === "working"}
                onClick={() => void onIdentify()}
              >
                {photoState === "working" ? s.identifying : s.identifyCta}
              </button>
            </div>

            {photoState === "unwired" && (
              <div className="rounded-2xl border border-line bg-surface px-5 py-4" role="status">
                <p className="text-base font-semibold text-ink-1">{s.photoUnwiredTitle}</p>
                <p className="mt-1 text-base leading-relaxed text-ink-2">{s.photoUnwiredBody}</p>
                <Link
                  href="/app/diagnose"
                  className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
                >
                  {s.runDiagnosisCta}
                </Link>
              </div>
            )}
            {photoState === "failed" && (
              <p
                className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip"
                role="alert"
              >
                {s.photoFailed}
              </p>
            )}

            {photoState === "done" && photoResult && (
              <div className="flex flex-col gap-4">
                {photoResult.lights.length === 0 ? (
                  <p
                    className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1"
                    role="status"
                  >
                    {photoResult.note || s.photoNone}
                  </p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-3">
                      {photoResult.lights.map((light) => (
                        <li
                          key={light.name}
                          className="rounded-2xl border border-line bg-surface px-5 py-4"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="font-display text-lg font-semibold text-ink-1">
                              {light.name}
                            </h3>
                            <span
                              className={
                                "text-sm font-semibold " + SEVERITY_TEXT[light.severity]
                              }
                            >
                              {light.severity}
                            </span>
                          </div>
                          <p className="mt-1.5 text-base leading-relaxed text-ink-2">
                            {light.meaning}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {photoResult.note && (
                      <p className="text-sm leading-relaxed text-ink-3">{photoResult.note}</p>
                    )}
                    {photoResult.odometerMiles !== null && (
                      <p className="text-base text-ink-2">
                        {s.odometerRead}:{" "}
                        <span className="font-semibold text-ink-1">
                          {photoResult.odometerMiles.toLocaleString()} mi
                        </span>
                      </p>
                    )}
                    <p className="text-sm leading-relaxed text-ink-3">
                      {photoResult.disclaimer}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className={primaryBtn}
                        onClick={() =>
                          handoffToDiagnose(
                            buildPhotoDiagnosisPrefill(photoResult.lights, photoVehicle),
                          )
                        }
                      >
                        {s.runDiagnosisCta}
                      </button>
                      <button
                        type="button"
                        className={ghostBtn}
                        onClick={() => {
                          setPhotoState("idle");
                          setPhotoResult(null);
                        }}
                      >
                        {s.retakeCta}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {/* ------------------------ Code mode ------------------------- */}
        {mode === "code" && (
          <section className="mt-6 flex flex-col gap-5">
            <div>
              <label htmlFor="scan-code" className={labelCls}>
                {s.codeLabel}
              </label>
              <input
                id="scan-code"
                className={inputCls + " font-mono uppercase"}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={5}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="P0420"
              />
              <p className="mt-2 text-sm leading-relaxed text-ink-3">{s.codeHint}</p>
              {code.trim() && !normalizedCode && (
                <p className="mt-2 text-base text-verdict-warn" role="alert">
                  {s.codeInvalid}
                </p>
              )}
              {normalizedCode && codeInfo && (
                <p className="mt-2 text-base text-ink-1" role="status">
                  <span className="font-mono font-semibold">{normalizedCode}</span>
                  {" · "}
                  {codeInfo.system} {s.codeSystemSuffix}
                  {" · "}
                  {codeInfo.scope === "generic" ? s.codeGeneric : s.codeManufacturer}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="scan-code-vehicle" className={labelCls}>
                {s.vehicleOptionalLabel}
              </label>
              <input
                id="scan-code-vehicle"
                className={inputCls}
                value={codeVehicle}
                onChange={(e) => setCodeVehicle(e.target.value)}
                placeholder={s.vehicleOptionalPlaceholder}
                autoComplete="off"
              />
            </div>

            <div>
              <button
                type="button"
                className={primaryBtn}
                disabled={!normalizedCode}
                onClick={() =>
                  normalizedCode &&
                  handoffToDiagnose(buildCodeDiagnosisPrefill(normalizedCode, codeVehicle))
                }
              >
                {s.codeExplainCta}
              </button>
              <p className="mt-3 text-sm leading-relaxed text-ink-3">{s.diagnosisNote}</p>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
