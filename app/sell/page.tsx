"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /sell — list a vehicle (WP6) + manage your listings.
 *
 * THE GUIDED PHOTO SET (owner's spec): six named slots — front, back,
 * right side, left side, dashboard/interior, whole vehicle — and a
 * 4-photo minimum, enforced by the API and mirrored in this form's
 * labels. Photos are links for now; an upload pipeline is a later
 * package (the owner's priority order: diagnostic core first).
 */

const SLOT_KEYS = ["front", "back", "right", "left", "interior", "whole"] as const;
type SlotKey = (typeof SLOT_KEYS)[number];

interface MyListing {
  id: string;
  title: string;
  price: number;
  status: string;
  views: number;
}

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
const labelCls = "block text-sm font-medium text-ink-2";

export default function SellPage() {
  const { t } = useLocale();
  const s = t.wp6.sell;
  const [mine, setMine] = useState<MyListing[]>([]);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<Record<SlotKey, string>>({
    front: "",
    back: "",
    right: "",
    left: "",
    interior: "",
    whole: "",
  });
  const [form, setForm] = useState({
    title: "",
    year: "",
    make: "",
    model: "",
    trim: "",
    mileage: "",
    price: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    description: "",
    knownProblems: "",
    color: "",
    engine: "",
    transmission: "Automatic",
    drivetrain: "FWD",
    titleStatus: "Clean Title",
    condition: "Good",
  });

  const loadMine = useCallback(async () => {
    const res = await apiFetch<{ results: MyListing[] }>("/api/listings?mine=1");
    if (res.status === 200) setMine(res.data.results);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    void loadMine();
  }, [loadMine]);

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    setError("");
    const images = SLOT_KEYS.filter((slot) => photos[slot].trim().length > 0).map((slot) => ({
      url: photos[slot].trim(),
      slot,
    }));
    const res = await apiFetch("/api/listings", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        price: form.price ? Number(form.price) : undefined,
        images,
      }),
    });
    if (res.status === 201) {
      setForm({
        title: "", year: "", make: "", model: "", trim: "", mileage: "", price: "",
        city: "", state: "", zip: "", phone: "", description: "", knownProblems: "",
        color: "", engine: "", transmission: "Automatic", drivetrain: "FWD",
        titleStatus: "Clean Title", condition: "Good",
      });
      setPhotos({ front: "", back: "", right: "", left: "", interior: "", whole: "" });
      await loadMine();
    } else {
      setError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  async function setStatus(id: string, status: string) {
    await apiFetch(`/api/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await loadMine();
  }

  async function removeListing(id: string) {
    await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
    await loadMine();
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {s.title}
        </h1>
        <p className="mt-1 text-base text-ink-2">{s.subtitle}</p>

        <form onSubmit={onPublish} className="mt-8 flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="sell-title" className={labelCls}>{s.formTitle}</label>
            <input id="sell-title" className={inputCls} placeholder={s.formTitlePlaceholder}
              value={form.title} onChange={set("title")} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sell-year" className={labelCls}>{s.year}</label>
              <input id="sell-year" className={inputCls} inputMode="numeric" placeholder="Enter year"
                value={form.year} onChange={set("year")} required />
            </div>
            <div>
              <label htmlFor="sell-price" className={labelCls}>{s.price}</label>
              <input id="sell-price" className={inputCls} inputMode="decimal" placeholder="Enter price"
                value={form.price} onChange={set("price")} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sell-make" className={labelCls}>{s.make}</label>
              <input id="sell-make" className={inputCls} value={form.make} onChange={set("make")} required />
            </div>
            <div>
              <label htmlFor="sell-model" className={labelCls}>{s.model}</label>
              <input id="sell-model" className={inputCls} value={form.model} onChange={set("model")} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sell-trim" className={labelCls}>{s.trim}</label>
              <input id="sell-trim" className={inputCls} value={form.trim} onChange={set("trim")} />
            </div>
            <div>
              <label htmlFor="sell-mileage" className={labelCls}>{s.mileage}</label>
              <input id="sell-mileage" className={inputCls} inputMode="numeric" placeholder="Enter mileage"
                value={form.mileage} onChange={set("mileage")} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="sell-city" className={labelCls}>{s.city}</label>
              <input id="sell-city" className={inputCls} value={form.city} onChange={set("city")} required />
            </div>
            <div>
              <label htmlFor="sell-state" className={labelCls}>{s.state}</label>
              <input id="sell-state" className={inputCls} value={form.state} onChange={set("state")} required />
            </div>
            <div>
              <label htmlFor="sell-zip" className={labelCls}>{s.zip}</label>
              <input id="sell-zip" className={inputCls} inputMode="numeric" value={form.zip} onChange={set("zip")} />
            </div>
          </div>
          <div>
            <label htmlFor="sell-phone" className={labelCls}>{s.phone}</label>
            <input id="sell-phone" className={inputCls} inputMode="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label htmlFor="sell-desc" className={labelCls}>{s.description}</label>
            <textarea id="sell-desc" rows={5}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink-1 placeholder:text-ink-3"
              value={form.description} onChange={set("description")} required />
          </div>
          <div>
            <label htmlFor="sell-problems" className={labelCls}>{s.knownProblems}</label>
            <textarea id="sell-problems" rows={3}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink-1 placeholder:text-ink-3"
              value={form.knownProblems} onChange={set("knownProblems")} />
          </div>

          <fieldset className="rounded-2xl border border-line bg-surface px-5 py-4">
            <legend className="px-1 font-display text-lg font-semibold text-ink-1">
              {s.photosTitle}
            </legend>
            <p className="text-sm leading-relaxed text-ink-2">{s.photosHelp}</p>
            <div className="mt-4 flex flex-col gap-3">
              {SLOT_KEYS.map((slot) => (
                <div key={slot}>
                  <label htmlFor={`photo-${slot}`} className={labelCls}>
                    {s.photoSlots[slot]}
                  </label>
                  <input
                    id={`photo-${slot}`}
                    className={inputCls}
                    placeholder={s.photoUrlPlaceholder}
                    value={photos[slot]}
                    onChange={(e) => setPhotos({ ...photos, [slot]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="h-14 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            {s.publish}
          </button>
        </form>

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold text-ink-1">{s.yourListings}</h2>
          {mine.length === 0 ? (
            <p className="mt-3 text-base text-ink-2">{s.noListings}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {mine.map((l) => (
                <li key={l.id} className="rounded-2xl border border-line bg-surface px-5 py-4">
                  <p className="font-display text-lg font-semibold text-ink-1">{l.title}</p>
                  <p className="mt-1 text-base text-ink-2">
                    ${l.price.toLocaleString()} · {l.status} · {l.views}{" "}
                    {t.wp6.marketplace.views}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {l.status === "active" ? (
                      <button type="button" onClick={() => void setStatus(l.id, "sold")}
                        className="flex h-12 items-center rounded-full border border-line px-5 text-base font-semibold text-ink-1">
                        {s.markSold}
                      </button>
                    ) : (
                      <button type="button" onClick={() => void setStatus(l.id, "active")}
                        className="flex h-12 items-center rounded-full border border-line px-5 text-base font-semibold text-ink-1">
                        {s.markActive}
                      </button>
                    )}
                    <button type="button" onClick={() => void removeListing(l.id)}
                      className="flex h-12 items-center rounded-full px-5 text-base font-semibold text-verdict-rip">
                      {s.remove}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
