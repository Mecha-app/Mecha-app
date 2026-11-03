"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /marketplace — public browse + search (WP6). Deliberately clean and
 * functional: the owner's priority order puts marketplace depth AFTER
 * the diagnostic core, so this is a trustworthy list with real ZIP
 * distances — not a polished storefront yet.
 */

interface Listing {
  id: string;
  title: string;
  year: string;
  make: string;
  model: string;
  price: number;
  mileage: number;
  city: string;
  state: string;
  images: { url: string; slot: string }[];
  distanceMi: number | null;
}

interface SearchResponse {
  count: number;
  results: Listing[];
}

function MarketplaceInner() {
  const { t } = useLocale();
  const mp = t.wp6.marketplace;
  const [query, setQuery] = useState("");
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  const runSearch = useCallback(
    async (q: string, z: string) => {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (z.trim()) qs.set("zip", z.trim());
      const res = await apiFetch<SearchResponse>(`/api/listings?${qs.toString()}`, {
        auth: false,
      });
      if (res.status === 200) {
        setResult(res.data);
        setError("");
      } else {
        setError(apiDetail(res.data, t.wp6.common.somethingWrong));
      }
    },
    [t],
  );

  useEffect(() => {
    setSignedIn(getToken() !== null);
    void runSearch("", "");
  }, [runSearch]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await runSearch(query, zip);
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {mp.title}
        </h1>
        <p className="mt-1 text-base text-ink-2">{mp.subtitle}</p>

        <form onSubmit={onSearch} className="mt-6 flex flex-col gap-3" noValidate>
          <input
            className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
            placeholder={mp.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={mp.searchPlaceholder}
          />
          <div className="flex gap-2">
            <input
              className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
              placeholder={mp.zipPlaceholder}
              inputMode="numeric"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              aria-label={mp.zipPlaceholder}
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              {mp.search}
            </button>
          </div>
        </form>

        {signedIn && (
          <Link
            href="/sell"
            className="mt-4 flex h-12 items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
          >
            {mp.sellCta}
          </Link>
        )}

        {error && (
          <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-8" aria-live="polite">
            <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {result.count} {mp.results}
            </h2>
            {result.count === 0 ? (
              <p className="mt-3 text-base text-ink-2">{mp.noResults}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {result.results.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/listing/${l.id}`}
                      className="flex gap-4 rounded-2xl border border-line bg-surface px-4 py-4"
                    >
                      {l.images[0] && (
                        // Listing photos are seller-supplied URLs; a plain
                        // img keeps arbitrary hosts working (next/image
                        // would need every host allow-listed).
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.images[0].url}
                          alt=""
                          className="h-24 w-28 shrink-0 rounded-xl object-cover"
                          loading="lazy"
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block font-display text-lg font-semibold leading-snug text-ink-1">
                          {l.title}
                        </span>
                        <span className="mt-1 block font-display text-xl font-semibold text-accent">
                          ${l.price.toLocaleString()}
                        </span>
                        <span className="mt-1 block text-sm text-ink-2">
                          {l.mileage.toLocaleString()} mi · {l.city}, {l.state}
                          {l.distanceMi !== null
                            ? ` · ${l.distanceMi.toFixed(1)} ${t.wp6.common.milesAway}`
                            : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceInner />
    </Suspense>
  );
}
