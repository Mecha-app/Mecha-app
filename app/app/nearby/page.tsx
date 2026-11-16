"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app/nearby — the signature roadside flow (WP6, owner's spec):
 * ZIP in (or the phone's location), and the answer leads with the
 * plain-language count — "6 shops near you" — then the list ordered
 * by distance. EVERY CARD LEADS WITH THE BUSINESS NAME (the largest
 * element on it); the tap-to-call phone and directions hang off the
 * name. Nothing stands between a stranded driver and a ringing phone.
 */

interface NearbyBusiness {
  id: string;
  kind: "shop" | "towing";
  name: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  distanceMi: number;
  distanceLabel: string;
  rating: number;
  specialties: string[];
  hours: string | null;
  isVerified: boolean;
}

interface NearbyResponse {
  headline: string;
  count: number;
  radiusMi: number;
  results: NearbyBusiness[];
}

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";

function directionsUrl(b: NearbyBusiness): string {
  const query = [b.name, b.address, b.city, b.state, b.zip]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || `${b.lat},${b.lng}`)}`;
}

export default function NearbyPage() {
  const { t } = useLocale();
  const n = t.wp6.nearby;
  const [kind, setKind] = useState<"shops" | "towing">("shops");
  const [zip, setZip] = useState("");
  const [phase, setPhase] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [result, setResult] = useState<NearbyResponse | null>(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("kind");
    if (param === "towing") setKind("towing");
  }, []);

  const runSearch = useCallback(
    async (params: { zip?: string; lat?: number; lng?: number }) => {
      setPhase("searching");
      setError("");
      const qs = new URLSearchParams({ kind });
      if (params.zip) qs.set("zip", params.zip);
      if (params.lat !== undefined && params.lng !== undefined) {
        qs.set("lat", String(params.lat));
        qs.set("lng", String(params.lng));
      }
      const res = await apiFetch<NearbyResponse>(`/api/nearby?${qs.toString()}`, { auth: false });
      if (res.status === 200) {
        setResult(res.data);
        setPhase("done");
      } else {
        setError(apiDetail(res.data, t.wp6.common.somethingWrong));
        setPhase("error");
      }
    },
    [kind, t],
  );

  async function onZipSearch(e: FormEvent) {
    e.preventDefault();
    if (zip.trim().length === 0) return;
    await runSearch({ zip: zip.trim() });
  }

  function onUseLocation() {
    if (!("geolocation" in navigator)) {
      setError(n.locationDenied);
      setPhase("error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void runSearch({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setError(n.locationDenied);
        setPhase("error");
      },
      { timeout: 10_000 },
    );
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {n.title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-2">
          {kind === "shops" ? n.introShops : n.introTowing}
        </p>

        {/* Kind toggle — two big targets, thumb-first. */}
        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label={n.title}>
          {(["shops", "towing"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => {
                setKind(k);
                setResult(null);
                setPhase("idle");
              }}
              className={
                "flex h-14 items-center justify-center rounded-full text-base font-semibold " +
                (kind === k
                  ? "bg-accent text-accent-ink"
                  : "border border-line bg-surface text-ink-1")
              }
            >
              {k === "shops" ? n.shopsTab : n.towingTab}
            </button>
          ))}
        </div>

        <form onSubmit={onZipSearch} className="mt-5 flex flex-col gap-3" noValidate>
          <label htmlFor="nearby-zip" className="block text-sm font-medium text-ink-2">
            {n.zipLabel}
          </label>
          <div className="flex gap-2">
            <input
              id="nearby-zip"
              className={inputCls}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder={n.zipPlaceholder}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
            <button
              type="submit"
              disabled={phase === "searching"}
              className="h-12 shrink-0 rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
            >
              {n.search}
            </button>
          </div>
          <button
            type="button"
            onClick={onUseLocation}
            disabled={locating || phase === "searching"}
            className="flex h-12 items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1 disabled:opacity-60"
          >
            {locating ? n.locating : n.useLocation}
          </button>
        </form>

        {phase === "searching" && (
          <p className="mt-8 text-base text-ink-2" role="status">
            {n.searching}
          </p>
        )}
        {phase === "error" && (
          <p className="mt-8 rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
            {error}
          </p>
        )}

        {phase === "done" && result && (
          <section className="mt-8" aria-live="polite">
            {/* The plain-language count, stated first. */}
            <h2 className="font-display text-2xl font-semibold text-ink-1">{result.headline}</h2>
            {result.count === 0 && (
              <p className="mt-2 text-base text-ink-2">{n.noResultsHelp}</p>
            )}
            <ul className="mt-5 flex flex-col gap-3">
              {result.results.map((b) => (
                <li key={b.id} className="rounded-2xl border border-line bg-surface px-5 py-4">
                  {/* THE NAME LEADS — largest element on the card. */}
                  <h3 className="font-display text-2xl font-semibold leading-tight text-ink-1">
                    {b.name}
                  </h3>
                  <p className="mt-1 text-base text-ink-2">
                    {b.distanceLabel}
                    {b.city ? ` · ${b.city}` : ""}
                    {b.state ? `, ${b.state}` : ""}
                    {b.isVerified ? ` · ${n.verified}` : ""}
                    {b.rating > 0 ? ` · ${b.rating.toFixed(1)} / 5` : ""}
                  </p>
                  {b.specialties.length > 0 && (
                    <p className="mt-1 text-sm text-ink-2">
                      {n.services}: {b.specialties.join(", ")}
                    </p>
                  )}
                  {b.hours && (
                    <p className="mt-1 text-sm text-ink-2">
                      {n.hours}: {b.hours}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={`tel:${b.phone.replace(/[^+0-9]/g, "")}`}
                      className="flex h-12 flex-1 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-ink"
                      aria-label={`${n.callNow}: ${b.name}`}
                    >
                      {t.wp6.common.call} {b.phone}
                    </a>
                    <a
                      href={directionsUrl(b)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-12 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
                    >
                      {t.wp6.common.directions}
                    </a>
                    {b.kind === "shop" && (
                      <Link
                        href={`/app/messages?shopId=${b.id}`}
                        className="flex h-12 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
                      >
                        {t.wp6.nav.messages}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
