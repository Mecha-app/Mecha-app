"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail } from "@/lib/client/api";
import { saveSession } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /business/register — self-signup for shops + towing companies
 * (WP6). The listing IS the signup: business name (which leads every
 * nearby card), the phone drivers tap to call, and the ZIP we geocode
 * server-side so the business is findable the moment it registers.
 * No dashboard edits, no separate site passwords beyond this account —
 * the account is created exactly the way the charter's Google-SSO
 * services will verify it later; email+password is the repo's model.
 */

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3";
const labelCls = "block text-sm font-medium text-ink-2";

interface BusinessResponse {
  token: string;
  business: {
    id: string;
    type: string;
    shopName?: string;
    companyName?: string;
    email: string;
    phone: string;
    plan: string;
  };
}

export default function BusinessRegisterPage() {
  const { t } = useLocale();
  const b = t.wp6.business;
  const router = useRouter();
  const [kind, setKind] = useState<"shop" | "towing">("shop");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    zip: "",
    address: "",
    city: "",
    state: "",
    specialties: "",
    hours: "",
    about: "",
    serviceRadiusMi: "25",
    truckCount: "1",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/business/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        [kind === "shop" ? "shopName" : "companyName"]: form.name,
        ownerName: form.ownerName || undefined,
        email: form.email,
        password: form.password,
        phone: form.phone,
        zip: form.zip,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        specialties:
          kind === "shop"
            ? form.specialties.split(",").map((x) => x.trim()).filter(Boolean)
            : undefined,
        hours: kind === "shop" ? form.hours || undefined : undefined,
        about: kind === "shop" ? form.about || undefined : undefined,
        serviceRadiusMi: kind === "towing" ? Number(form.serviceRadiusMi) : undefined,
        truckCount: kind === "towing" ? Number(form.truckCount) : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BusinessResponse> & {
      detail?: string;
    };
    if (res.status === 201 && data.token && data.business) {
      saveSession(data.token, {
        id: data.business.id,
        name: data.business.shopName ?? data.business.companyName ?? "",
        email: data.business.email,
        phone: data.business.phone,
        plan: data.business.plan,
        type: data.business.type,
      });
      router.push("/app");
    } else {
      setError(apiDetail(data, t.wp6.common.somethingWrong));
    }
  }

  return (
    <>
      <AppNav business logoHref="/" />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {b.registerTitle}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-2">{b.registerSub}</p>

        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label={b.registerTitle}>
          {(["shop", "towing"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={
                "flex h-14 items-center justify-center rounded-full text-base font-semibold " +
                (kind === k ? "bg-accent text-accent-ink" : "border border-line bg-surface text-ink-1")
              }
            >
              {k === "shop" ? b.kindShop : b.kindTowing}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="biz-name" className={labelCls}>
              {kind === "shop" ? b.nameShop : b.nameTowing}
            </label>
            <input id="biz-name" className={inputCls} value={form.name} onChange={set("name")} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="biz-email" className={labelCls}>{b.email}</label>
              <input id="biz-email" className={inputCls} type="email" autoComplete="email"
                value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label htmlFor="biz-password" className={labelCls}>{b.password}</label>
              <input id="biz-password" className={inputCls} type="password" autoComplete="new-password"
                value={form.password} onChange={set("password")} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="biz-phone" className={labelCls}>{b.phone}</label>
              <input id="biz-phone" className={inputCls} inputMode="tel" autoComplete="tel"
                value={form.phone} onChange={set("phone")} required />
            </div>
            <div>
              <label htmlFor="biz-zip" className={labelCls}>{b.zip}</label>
              <input id="biz-zip" className={inputCls} inputMode="numeric" autoComplete="postal-code"
                value={form.zip} onChange={set("zip")} required />
            </div>
          </div>
          <div>
            <label htmlFor="biz-owner" className={labelCls}>{b.ownerName}</label>
            <input id="biz-owner" className={inputCls} value={form.ownerName} onChange={set("ownerName")} />
          </div>
          {kind === "shop" && (
            <>
              <div>
                <label htmlFor="biz-address" className={labelCls}>{b.address}</label>
                <input id="biz-address" className={inputCls} value={form.address} onChange={set("address")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="biz-city" className={labelCls}>{b.city}</label>
                  <input id="biz-city" className={inputCls} value={form.city} onChange={set("city")} />
                </div>
                <div>
                  <label htmlFor="biz-state" className={labelCls}>{b.state}</label>
                  <input id="biz-state" className={inputCls} value={form.state} onChange={set("state")} />
                </div>
              </div>
              <div>
                <label htmlFor="biz-specialties" className={labelCls}>{b.specialties}</label>
                <input id="biz-specialties" className={inputCls} placeholder="Enter your specialties"
                  value={form.specialties} onChange={set("specialties")} />
              </div>
              <div>
                <label htmlFor="biz-hours" className={labelCls}>{b.hours}</label>
                <input id="biz-hours" className={inputCls} value={form.hours} onChange={set("hours")} />
              </div>
              <div>
                <label htmlFor="biz-about" className={labelCls}>{b.about}</label>
                <textarea id="biz-about" rows={3}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base leading-relaxed text-ink-1 placeholder:text-ink-3"
                  value={form.about} onChange={set("about")} />
              </div>
            </>
          )}
          {kind === "towing" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="biz-radius" className={labelCls}>{b.serviceRadius}</label>
                <input id="biz-radius" className={inputCls} inputMode="numeric"
                  value={form.serviceRadiusMi} onChange={set("serviceRadiusMi")} />
              </div>
              <div>
                <label htmlFor="biz-trucks" className={labelCls}>{b.truckCount}</label>
                <input id="biz-trucks" className={inputCls} inputMode="numeric"
                  value={form.truckCount} onChange={set("truckCount")} />
              </div>
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="h-14 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            {b.createAccount}
          </button>
        </form>
        <p className="mt-6 text-center text-base text-ink-2">
          <Link href="/business/login" className="font-medium text-ink-1">
            {b.haveAccount}
          </Link>
        </p>
      </main>
    </>
  );
}
