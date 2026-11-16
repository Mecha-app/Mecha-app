"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail } from "@/lib/client/api";
import { saveSession } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** /business/login — shop + towing sign-in (WP6). */

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

export default function BusinessLoginPage() {
  const { t } = useLocale();
  const b = t.wp6.business;
  const router = useRouter();
  const [kind, setKind] = useState<"shop" | "towing">("shop");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/business/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<BusinessResponse> & {
      detail?: string;
    };
    if (res.status === 200 && data.token && data.business) {
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
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {b.loginTitle}
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label={b.loginTitle}>
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
            <label htmlFor="biz-login-email" className={labelCls}>{b.email}</label>
            <input id="biz-login-email" className={inputCls} type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="biz-login-password" className={labelCls}>{b.password}</label>
            <input id="biz-login-password" className={inputCls} type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <p className="rounded-xl border border-line bg-surface px-4 py-3 text-base text-verdict-rip" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="h-14 w-full rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
          >
            {b.signIn}
          </button>
        </form>
        <p className="mt-6 text-center text-base text-ink-2">
          <Link href="/business/register" className="font-medium text-ink-1">
            {b.newHere}
          </Link>
        </p>
      </main>
    </>
  );
}
