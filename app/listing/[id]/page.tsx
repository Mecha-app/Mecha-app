"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { apiFetch } from "@/lib/client/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /listing/[id] — one vehicle's story (WP6): the guided photos by
 * slot, the honest description + known problems, the facts table, and
 * the seller's tap-to-call phone. Sold/removed listings answer like
 * they were never here (the API enforces it; this is the empty state).
 */

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  knownProblems: string | null;
  price: number;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  titleStatus: string;
  condition: string;
  color: string | null;
  transmission: string;
  drivetrain: string;
  engine: string | null;
  phone: string | null;
  city: string;
  state: string;
  zip: string | null;
  status: string;
  views: number;
  sellerName: string | null;
  images: { url: string; slot: string }[];
}

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const l = t.wp6.listing;
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<{ listing: ListingDetail }>(`/api/listings/${id}`, {
        auth: false,
      });
      if (res.status === 200) setListing(res.data.listing);
      else setMissing(true);
    })();
  }, [id]);

  const facts: Array<[string, string]> = listing
    ? [
        [l.mileage, `${listing.mileage.toLocaleString()} mi`],
        [l.titleStatus, listing.titleStatus],
        [l.condition, listing.condition],
        [l.transmission, listing.transmission],
        [l.drivetrain, listing.drivetrain],
        ...(listing.engine ? [[l.engine, listing.engine] as [string, string]] : []),
        ...(listing.color ? [[l.color, listing.color] as [string, string]] : []),
        [l.location, `${listing.city}, ${listing.state}${listing.zip ? ` ${listing.zip}` : ""}`],
        [t.wp6.marketplace.views, String(listing.views)],
      ]
    : [];

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link href="/marketplace" className="flex h-12 items-center text-base font-medium text-ink-2">
          ← {l.backToMarketplace}
        </Link>

        {missing && <p className="mt-6 text-base text-ink-2">{l.notFound}</p>}

        {listing && (
          <>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-[-0.01em] text-ink-1">
              {listing.title}
            </h1>
            <p className="mt-2 font-display text-3xl font-semibold text-accent">
              ${listing.price.toLocaleString()}
            </p>
            {listing.status === "sold" && (
              <p className="mt-2 text-base font-semibold text-verdict-warn">{l.statusSold}</p>
            )}

            {listing.images.length > 0 && (
              <section className="mt-6" aria-label={l.photos}>
                <ul className="flex flex-col gap-3">
                  {listing.images.map((photo, i) => (
                    <li key={i}>
                      {/* Seller-supplied photo URLs — plain img, see marketplace note. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`${listing.title} — ${t.wp6.sell.photoSlots[photo.slot as keyof typeof t.wp6.sell.photoSlots] ?? photo.slot}`}
                        className="w-full rounded-2xl border border-line object-cover"
                        loading="lazy"
                      />
                      <span className="mt-1 block text-sm text-ink-3">
                        {t.wp6.sell.photoSlots[photo.slot as keyof typeof t.wp6.sell.photoSlots] ??
                          photo.slot}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                {l.description}
              </h2>
              <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink-1">
                {listing.description}
              </p>
              {listing.knownProblems && (
                <>
                  <h3 className="mt-6 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                    {l.knownProblems}
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-ink-1">
                    {listing.knownProblems}
                  </p>
                </>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
                {l.details}
              </h2>
              <dl className="mt-3 flex flex-col gap-2">
                {facts.map(([term, value]) => (
                  <div
                    key={term}
                    className="flex justify-between gap-4 border-b border-line pb-2 text-base"
                  >
                    <dt className="text-ink-2">{term}</dt>
                    <dd className="font-medium text-ink-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {listing.phone && (
              <a
                href={`tel:${listing.phone.replace(/[^+0-9]/g, "")}`}
                className="mt-8 flex h-14 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
              >
                {l.callSeller}
                {listing.sellerName ? ` — ${listing.sellerName}` : ""}
              </a>
            )}
          </>
        )}
      </main>
    </>
  );
}
