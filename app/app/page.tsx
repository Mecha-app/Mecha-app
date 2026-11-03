"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { BillingSection } from "@/components/BillingSection";
import { apiFetch } from "@/lib/client/api";
import { getStoredUser, getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app — the cockpit (WP6). For a driver: the free-diagnosis meter
 * (always visible, always server-stated — the owner's rule), their
 * vehicles, recent diagnoses, and the quick actions that ARE the
 * product: Diagnose, Find a shop, Find a tow, Marketplace.
 * For a shop/towing account: their business profile + plan state.
 * Mobile-first: one column, every action a ≥48px target.
 */

interface QuotaView {
  plan: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  canDiagnose: boolean;
}

interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  nickname: string | null;
}

interface Diagnosis {
  id: string;
  problemText: string | null;
  createdAt: string;
  aiResult: { severity?: string; diagnosis?: string } | null;
}

interface Business {
  id: string;
  type: string;
  shopName?: string;
  companyName?: string;
  email: string;
  phone: string;
  zip: string | null;
  plan: string;
}

export default function DashboardPage() {
  const { t } = useLocale();
  const d = t.wp6.dashboard;
  const [kind, setKind] = useState<"driver" | "business" | null>(null);
  const [name, setName] = useState("");
  const [quota, setQuota] = useState<QuotaView | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    const stored = getStoredUser();
    if (stored && (stored.type === "shop" || stored.type === "towing")) {
      setKind("business");
      void (async () => {
        const res = await apiFetch<{ business: Business }>("/api/business/me");
        if (res.status === 200) setBusiness(res.data.business);
      })();
      return;
    }
    setKind("driver");
    void (async () => {
      const [me, veh, diag] = await Promise.all([
        apiFetch<{ user: { name: string }; quota: QuotaView }>("/api/auth/me"),
        apiFetch<{ vehicles: Vehicle[] }>("/api/vehicles"),
        apiFetch<{ diagnoses: Diagnosis[] }>("/api/diagnoses/recent"),
      ]);
      if (me.status === 200) {
        setName(me.data.user.name);
        setQuota(me.data.quota);
      }
      if (veh.status === 200) setVehicles(veh.data.vehicles);
      if (diag.status === 200) setDiagnoses(diag.data.diagnoses);
    })();
  }, []);

  const actions = [
    { href: "/app/diagnose", title: d.actionDiagnose, sub: d.actionDiagnoseSub },
    { href: "/app/nearby?kind=shops", title: d.actionShop, sub: d.actionShopSub },
    { href: "/app/nearby?kind=towing", title: d.actionTow, sub: d.actionTowSub },
    { href: "/marketplace", title: d.actionMarketplace, sub: d.actionMarketplaceSub },
    { href: "/sell", title: d.actionSell, sub: d.actionSellSub },
    { href: "/app/vault", title: t.wp6.vault.title, sub: d.viewVault },
  ];

  return (
    <>
      <AppNav business={kind === "business"} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {d.title}
        </h1>
        {(name || business) && (
          <p className="mt-1 text-base text-ink-2">
            {d.welcomeBack}, {name || business?.shopName || business?.companyName}
          </p>
        )}

        {kind === "driver" && quota && (
          <section
            className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4"
            role="status"
            aria-live="polite"
          >
            {quota.plan === "pro" ? (
              <p className="text-base font-medium text-ink-1">{d.quotaPro}</p>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold text-ink-1">
                  {quota.remaining} {d.quotaOf} {quota.limit} {d.quotaLeft}
                </p>
                {/* The meter: five segments, spent ones dimmed. */}
                <div className="mt-3 flex gap-1.5" aria-hidden="true">
                  {Array.from({ length: quota.limit ?? 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        "h-2 flex-1 rounded-full " +
                        (i < (quota.remaining ?? 0) ? "bg-accent" : "bg-inset")
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {kind === "driver" && (
          <>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {d.quickActions}
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="rounded-2xl border border-line bg-surface px-5 py-4"
                >
                  <span className="block font-display text-lg font-semibold text-ink-1">
                    {a.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-2">{a.sub}</span>
                </Link>
              ))}
            </div>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {d.yourVehicles}
            </h2>
            {vehicles.length === 0 ? (
              <p className="mt-3 text-base text-ink-2">{d.noVehicles}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {vehicles.map((v) => (
                  <li key={v.id}>
                    <Link
                      href="/app/vault"
                      className="flex min-h-12 items-center rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink-1"
                    >
                      {v.nickname ? `${v.nickname} — ` : ""}
                      {v.year} {v.make} {v.model}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/app/vault"
              className="mt-4 flex h-12 items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
            >
              {d.addVehicle}
            </Link>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {d.recentDiagnoses}
            </h2>
            {diagnoses.length === 0 ? (
              <p className="mt-3 text-base text-ink-2">{d.noDiagnoses}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {diagnoses.map((diag) => (
                  <li
                    key={diag.id}
                    className="rounded-xl border border-line bg-surface px-4 py-3"
                  >
                    <span className="text-sm font-medium text-ink-2">
                      {new Date(diag.createdAt).toLocaleDateString()}
                      {diag.aiResult?.severity ? ` · ${diag.aiResult.severity}` : ""}
                    </span>
                    <span className="mt-1 block text-base text-ink-1">
                      {diag.problemText ?? diag.aiResult?.diagnosis ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {quota && <BillingSection kind="driver" fallbackPlan={quota.plan} />}
          </>
        )}

        {kind === "business" && business && (
          <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-5">
            <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {d.businessProfile}
            </h2>
            <p className="mt-3 font-display text-2xl font-semibold text-ink-1">
              {business.shopName ?? business.companyName}
            </p>
            <dl className="mt-4 flex flex-col gap-2 text-base text-ink-2">
              <div className="flex justify-between gap-4">
                <dt>{d.businessPlan}</dt>
                <dd className="font-medium text-ink-1">{business.plan}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t.wp6.business.phone}</dt>
                <dd className="font-medium text-ink-1">{business.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>{t.wp6.business.zip}</dt>
                <dd className="font-medium text-ink-1">{business.zip ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/app/messages"
                className="flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
              >
                {d.businessMessages}
              </Link>
              <Link
                href="/app/nearby"
                className="flex h-12 items-center justify-center rounded-full border border-line px-6 text-base font-semibold text-ink-1"
              >
                {d.actionShop}
              </Link>
            </div>
          </section>
        )}

        {kind === "business" && business && (
          <BillingSection kind="business" fallbackPlan={business.plan} />
        )}
      </main>
    </>
  );
}
