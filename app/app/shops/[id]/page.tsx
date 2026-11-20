"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { BusinessAvatar } from "@/components/BusinessAvatar";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getStoredUser, getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app/shops/<id> — the shop PROFILE page (owner order 2026-11-20,
 * "kind of like a Facebook page" for the shop). This is where a
 * driver lands when they tap a shop in the nearby/ZIP/towing
 * results:
 *   - header: logo (or the clean initials block) + name + rating;
 *   - contact block, everything tappable: phone in full → tel: call,
 *     email → mailto:, full address → a universal maps link;
 *   - what the profile holds: hours, specialties, languages, about;
 *   - for shops, the REAL reviews (0022): average + count up top,
 *     the list below, and — for a signed-in driver — the write/edit
 *     form (one review per account; the store enforces it).
 * All data comes from the business's own profile record via
 * GET /api/shops/<id> — nothing here is scraped or hardcoded.
 */

interface Profile {
  id: string;
  kind: "shop" | "towing";
  name: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  about: string | null;
  specialties: string[];
  languages: string[];
  hours: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  logoUrl: string | null;
  galleryUrls: string[];
  serviceRadiusMi: number | null;
}

interface Review {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  photoUrls: string[];
  createdAt: string;
}

interface Mine {
  rating: number;
  body: string;
  photoIds: string[];
  photoUrls: string[];
}

interface ProfileResponse {
  profile: Profile;
  reviews: Review[];
}

function mapsUrl(p: Profile): string {
  const query = [p.name, p.address, p.city, p.state, p.zip].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function fullAddress(p: Profile): string {
  return [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ");
}

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));
}

export default function ShopProfilePage() {
  const { t } = useLocale();
  const p = t.wp6.profile;
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [phase, setPhase] = useState<"loading" | "done" | "missing" | "error">("loading");
  const [canReview, setCanReview] = useState(false);
  const [mine, setMine] = useState<Mine | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<ProfileResponse>(`/api/shops/${id}`, { auth: false });
    if (res.status === 200) {
      setData(res.data);
      setPhase("done");
    } else if (res.status === 404) {
      setPhase("missing");
    } else {
      setPhase("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const me = getStoredUser();
    if (!me || me.type !== "driver") return;
    setCanReview(true);
    void (async () => {
      const res = await apiFetch<{ mine: Mine | null }>(`/api/shops/${id}/reviews`);
      if (res.status === 200 && res.data.mine) {
        setMine(res.data.mine);
        setRating(res.data.mine.rating);
        setBody(res.data.mine.body);
        setPhotos(
          res.data.mine.photoIds.map((pid, i) => ({
            id: pid,
            url: res.data.mine!.photoUrls[i] ?? "",
          })),
        );
      }
    })();
  }, [id]);

  async function onAttachPhoto(file: File) {
    setPhotoBusy(true);
    setFormError("");
    const form = new FormData();
    form.append("photo", file);
    const token = getToken();
    const res = await fetch("/api/reviews/photos", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setPhotoBusy(false);
    if (res.ok) {
      const data = (await res.json()) as { photo: { id: string; url: string } };
      setPhotos((prev) => [...prev, { id: data.photo.id, url: data.photo.url }].slice(0, 3));
    } else {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      setFormError(
        typeof data.detail === "string" && data.detail
          ? data.detail
          : t.wp6.common.somethingWrong,
      );
    }
  }

  async function onSubmitReview(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const res = await apiFetch(`/api/shops/${id}/reviews`, {
      method: "POST",
      body: JSON.stringify({ rating, body, photoIds: photos.map((ph) => ph.id) }),
    });
    setSaving(false);
    if (res.status === 201) {
      setThanks(true);
      await load();
      const again = await apiFetch<{ mine: Mine | null }>(`/api/shops/${id}/reviews`);
      if (again.status === 200) setMine(again.data.mine);
    } else {
      setFormError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  const profile = data?.profile ?? null;
  const reviews = data?.reviews ?? [];

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link href="/app/nearby" className="text-base font-medium text-accent">
          ← {p.back}
        </Link>

        {phase === "loading" && <p className="mt-8 text-base text-ink-2">{t.wp6.common.loading}</p>}
        {phase === "missing" && (
          <p className="mt-8 text-base text-ink-2">{t.wp6.common.somethingWrong}</p>
        )}
        {phase === "error" && (
          <p className="mt-8 text-base text-ink-2">{t.wp6.common.somethingWrong}</p>
        )}

        {phase === "done" && profile && (
          <>
            {/* Header — logo + name, like the top of a Facebook page. */}
            <div className="mt-6 flex items-center gap-4">
              <BusinessAvatar
                name={profile.name}
                logoUrl={profile.logoUrl}
                sizeClass="h-20 w-20 text-2xl rounded-3xl"
              />
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-semibold leading-tight text-ink-1">
                  {profile.name}
                </h1>
                <p className="mt-1 text-base text-ink-2">
                  {profile.rating > 0
                    ? `${stars(Math.round(profile.rating))} ${profile.rating.toFixed(1)} / 5`
                    : ""}
                  {profile.kind === "shop" && profile.reviewCount > 0
                    ? ` · ${profile.reviewCount} ${p.reviewCountLabel}`
                    : ""}
                  {profile.isVerified ? ` · ${t.wp6.nearby.verified}` : ""}
                </p>
              </div>
            </div>

            {/* Contact block — everything tappable. */}
            <section className="mt-6 flex flex-col gap-3">
              <a
                href={`tel:${profile.phone.replace(/[^+0-9]/g, "")}`}
                className="flex h-14 items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-accent-ink"
              >
                {t.wp6.common.call} {profile.phone}
              </a>
              <div className="grid gap-2 sm:grid-cols-2">
                <a
                  href={`mailto:${profile.email}`}
                  className="flex min-h-12 items-center justify-center break-all rounded-full border border-line px-5 py-2 text-center text-base font-semibold text-ink-1"
                >
                  {profile.email}
                </a>
                {fullAddress(profile) ? (
                  <a
                    href={mapsUrl(profile)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center justify-center rounded-full border border-line px-5 py-2 text-center text-base font-semibold text-ink-1"
                  >
                    {fullAddress(profile)}
                  </a>
                ) : profile.zip ? (
                  <span className="flex min-h-12 items-center justify-center rounded-full border border-line px-5 py-2 text-center text-base text-ink-2">
                    ZIP {profile.zip}
                  </span>
                ) : null}
              </div>
              {profile.kind === "shop" && (
                <Link
                  href={`/app/messages?shopId=${profile.id}`}
                  className="flex h-12 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
                >
                  {t.wp6.nav.messages}
                </Link>
              )}
            </section>

            {/* What the profile holds. */}
            {(profile.hours ||
              profile.specialties.length > 0 ||
              profile.languages.length > 0 ||
              profile.about) && (
              <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-4">
                <dl className="flex flex-col divide-y divide-line text-base">
                  {profile.hours && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-ink-3">{t.wp6.nearby.hours}</dt>
                      <dd className="text-right font-medium text-ink-1">{profile.hours}</dd>
                    </div>
                  )}
                  {profile.specialties.length > 0 && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-ink-3">{t.wp6.nearby.services}</dt>
                      <dd className="text-right font-medium text-ink-1">
                        {profile.specialties.join(", ")}
                      </dd>
                    </div>
                  )}
                  {profile.languages.length > 0 && (
                    <div className="flex justify-between gap-4 py-3">
                      <dt className="text-ink-3">{p.languages}</dt>
                      <dd className="text-right font-medium text-ink-1">
                        {profile.languages.join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
                {profile.about && (
                  <div className="pt-3">
                    <h2 className="text-sm font-medium text-ink-3">{p.aboutLabel}</h2>
                    <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-ink-1">
                      {profile.about}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* The shop's gallery — their own uploaded photos. */}
            {profile.galleryUrls.length > 0 && (
              <section className="mt-6">
                <div className="grid grid-cols-2 gap-2">
                  {profile.galleryUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-2xl object-cover"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Reviews — shops only, real accounts only. */}
            {profile.kind === "shop" && (
              <section className="mt-8">
                <h2 className="font-display text-2xl font-semibold text-ink-1">{p.reviews}</h2>
                <p className="mt-1 text-base text-ink-2">
                  {profile.reviewCount > 0
                    ? `${profile.rating.toFixed(1)} / 5 · ${profile.reviewCount} ${p.reviewCountLabel}`
                    : p.noReviews}
                </p>

                {reviews.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-3">
                    {reviews.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-2xl border border-line bg-surface px-5 py-4"
                      >
                        <p className="text-base text-accent" aria-label={`${r.rating} / 5`}>
                          {stars(r.rating)}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-ink-1">
                          {r.body}
                        </p>
                        {r.photoUrls.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {r.photoUrls.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  loading="lazy"
                                  className="h-20 w-20 rounded-xl object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-sm text-ink-3">
                          {r.authorName} · {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {canReview ? (
                  <form
                    onSubmit={onSubmitReview}
                    className="mt-5 rounded-2xl border border-line bg-surface px-5 py-4"
                  >
                    <h3 className="font-display text-lg font-semibold text-ink-1">
                      {mine ? p.yourReview : p.writeReview}
                    </h3>
                    <div className="mt-3 flex gap-1" role="radiogroup" aria-label={p.reviews}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={rating === value}
                          onClick={() => setRating(value)}
                          className="px-1 text-3xl leading-none text-accent"
                        >
                          {value <= rating ? "★" : "☆"}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={p.reviewPlaceholder}
                      rows={3}
                      maxLength={1000}
                      className="mt-3 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1 placeholder:text-ink-3"
                    />
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      {photos.map((ph) => (
                        <span key={ph.id} className="relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={ph.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          <button
                            type="button"
                            aria-label={t.wp6.common.delete}
                            onClick={() =>
                              setPhotos((prev) => prev.filter((x) => x.id !== ph.id))
                            }
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-1 text-xs font-bold text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {photos.length < 3 && (
                        <label className="flex h-11 cursor-pointer items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-ink-1">
                          {t.wp6.business.logoAdd}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={photoBusy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) void onAttachPhoto(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {formError && <p className="mt-2 text-sm text-danger">{formError}</p>}
                    {thanks && <p className="mt-2 text-sm text-ink-2">{p.reviewThanks}</p>}
                    <button
                      type="submit"
                      disabled={saving || body.trim().length === 0}
                      className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-50"
                    >
                      {t.wp6.common.save}
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-base text-ink-2">{p.signInToReview}</p>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
