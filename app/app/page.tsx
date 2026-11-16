"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { BillingSection } from "@/components/BillingSection";
import { LoopClip } from "@/components/LoopClip";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getStoredUser, getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app — the cockpit (WP6). For a driver: the free-diagnosis meter
 * (always visible, always server-stated — the owner's rule), their
 * vehicles, recent diagnoses, and the quick actions that ARE the
 * product: Diagnose, Find a shop, Find a tow, Marketplace.
 * For a shop/towing account: their business profile + plan state.
 * Mobile-first: one column, every action a ≥48px target.
 *
 * Design pass "Tesla" (2026-11-16, owner: "the dashboard is not
 * Tesla-like… lots of text"): the quick actions are now big
 * icon tiles — icon + one-line label, the explanatory sub-lines are
 * gone; the free meter leads with the remaining count as a large
 * numeral; and a driver with no vehicle yet gets a looping film of
 * the product in use instead of an empty-state sentence. Data,
 * flows, and destinations are unchanged.
 */

/** Action-tile glyphs — MECHA line set (§1.6), drawn not emoji. */
function TileIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const ACTION_ICONS: Record<string, ReactNode> = {
  diagnose: (
    <path d="M14.7 6.3a4.6 4.6 0 0 0-6.1 6.1L3 18l3 3 5.6-5.6a4.6 4.6 0 0 0 6.1-6.1L14.5 12l-2.5-2.5 2.7-3.2z" />
  ),
  shop: (
    <>
      <path d="M12 21s-6.7-5.3-6.7-10.3a6.7 6.7 0 1 1 13.4 0C18.7 15.7 12 21 12 21z" />
      <circle cx="12" cy="10.2" r="2.4" />
    </>
  ),
  tow: (
    <>
      <path d="M2.5 6.5h11V16h-11z" />
      <path d="M13.5 10h3.8l3.2 3.2V16h-7" />
      <circle cx="6.5" cy="17.8" r="1.7" />
      <circle cx="16.8" cy="17.8" r="1.7" />
    </>
  ),
  marketplace: (
    <>
      <path d="M5.5 8h13l-1.1 12h-10.8L5.5 8z" />
      <path d="M9 10.5V6.8a3 3 0 0 1 6 0v3.7" />
    </>
  ),
  sell: (
    <>
      <path d="M3.5 3.5H11L20.5 13 13 20.5 3.5 11z" />
      <circle cx="8" cy="8" r="1.6" />
    </>
  ),
  vault: <path d="M12 3l7 2.8v6.1c0 4.4-2.9 7.4-7 9.1-4.1-1.7-7-4.7-7-9.1V5.8z" />,
};

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
  // Email verification (0011, SOFT GATE): the banner shows until the
  // server says the email is verified; nothing else waits on it.
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  // Phone completion (social login package): a Google-created account
  // starts phone-less; the banner below mirrors the verify banner —
  // visible until the number is on file, because diagnoses stay
  // locked until then (the identity is email AND phone).
  const [phoneMissing, setPhoneMissing] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyState, setVerifyState] = useState<
    "idle" | "working" | "done" | "sent" | "unavailable" | "error"
  >("idle");
  const [verifyDetail, setVerifyDetail] = useState("");

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
        apiFetch<{
          user: { name: string; emailVerified: boolean; phone: string | null };
          quota: QuotaView;
        }>("/api/auth/me"),
        apiFetch<{ vehicles: Vehicle[] }>("/api/vehicles"),
        apiFetch<{ diagnoses: Diagnosis[] }>("/api/diagnoses/recent"),
      ]);
      if (me.status === 200) {
        setName(me.data.user.name);
        setQuota(me.data.quota);
        setEmailVerified(me.data.user.emailVerified);
        setPhoneMissing(me.data.user.phone === null);
      }
      if (veh.status === 200) setVehicles(veh.data.vehicles);
      if (diag.status === 200) setDiagnoses(diag.data.diagnoses);
    })();
  }, []);

  async function onVerify() {
    setVerifyState("working");
    setVerifyDetail("");
    const res = await apiFetch<{ user: { emailVerified: boolean } }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ code: verifyCode }),
    });
    if (res.status === 200) {
      setEmailVerified(true);
      setVerifyState("done");
    } else {
      setVerifyState("error");
      setVerifyDetail(apiDetail(res.data, "That code doesn't match, or it has expired."));
    }
  }

  async function onResendCode() {
    setVerifyState("working");
    setVerifyDetail("");
    const res = await apiFetch<{ delivery?: string }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (res.status === 200 && res.data.delivery === "sent") {
      setVerifyState("sent");
    } else if (res.status === 200) {
      // Delivery state said not_configured/failed — state it honestly.
      setVerifyState("unavailable");
    } else if (res.status === 409) {
      setEmailVerified(true);
      setVerifyState("done");
    } else {
      setVerifyState("error");
      setVerifyDetail(apiDetail(res.data, "Something went wrong. Please try again."));
    }
  }

  const actions = [
    { href: "/app/diagnose", title: d.actionDiagnose, icon: ACTION_ICONS.diagnose },
    { href: "/app/nearby?kind=shops", title: d.actionShop, icon: ACTION_ICONS.shop },
    { href: "/app/nearby?kind=towing", title: d.actionTow, icon: ACTION_ICONS.tow },
    { href: "/marketplace", title: d.actionMarketplace, icon: ACTION_ICONS.marketplace },
    { href: "/sell", title: d.actionSell, icon: ACTION_ICONS.sell },
    { href: "/app/vault", title: t.wp6.vault.title, icon: ACTION_ICONS.vault },
  ];

  return (
    <>
      <AppNav business={kind === "business"} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
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
              <p className="text-xl font-medium text-ink-1">{d.quotaPro}</p>
            ) : (
              <>
                <p className="flex flex-wrap items-end gap-x-3">
                  <span className="tnum font-display text-6xl font-semibold leading-none text-ink-1">
                    {quota.remaining}
                  </span>
                  <span className="pb-1 text-base text-ink-2">
                    {d.quotaOf} {quota.limit} {d.quotaLeft}
                  </span>
                </p>
                {/* The meter: five segments, spent ones dimmed. */}
                <div className="mt-4 flex gap-1.5" aria-hidden="true">
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

        {kind === "driver" && phoneMissing && (
          <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-ink-1">
              {t.auth.completeProfile.bannerTitle}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-ink-2">
              {t.auth.completeProfile.bannerBody}
            </p>
            <Link
              href="/app/complete-profile"
              className="mt-4 flex h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
            >
              {t.auth.completeProfile.bannerCta}
            </Link>
          </section>
        )}

        {kind === "driver" && (emailVerified === false || verifyState === "done") && (
          <section className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-ink-1">{d.verifyTitle}</h2>
            {verifyState === "done" ? (
              <p className="mt-2 text-base text-verdict-fair" role="status">
                {d.verifyDone}
              </p>
            ) : (
              <>
                <p className="mt-2 text-base leading-relaxed text-ink-2">{d.verifyBody}</p>
                {verifyState === "sent" && (
                  <p className="mt-2 text-base text-ink-1" role="status">
                    {d.verifySent}
                  </p>
                )}
                {verifyState === "unavailable" && (
                  <p className="mt-2 text-base text-ink-2" role="status">
                    {d.verifyUnavailable}
                  </p>
                )}
                {verifyState === "error" && (
                  <p className="mt-2 text-base text-verdict-rip" role="alert">
                    {verifyDetail}
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    aria-label={d.verifyCodeLabel}
                    className="h-12 flex-1 rounded-xl border border-line bg-surface px-4 font-mono text-base text-ink-1 placeholder:text-ink-3"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="Enter the 6-digit code"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={verifyState === "working" || verifyCode.trim().length !== 6}
                    onClick={() => void onVerify()}
                    className="h-12 rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
                  >
                    {d.verifyButton}
                  </button>
                  <button
                    type="button"
                    disabled={verifyState === "working"}
                    onClick={() => void onResendCode()}
                    className="h-12 rounded-full border border-line px-6 text-base font-semibold text-ink-1 disabled:opacity-60"
                  >
                    {d.verifyResend}
                  </button>
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
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex min-h-[76px] items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-5"
                >
                  <span className="text-accent">
                    <TileIcon>{a.icon}</TileIcon>
                  </span>
                  <span className="font-display text-xl font-semibold text-ink-1">
                    {a.title}
                  </span>
                </Link>
              ))}
            </div>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-eyebrow text-ink-2">
              {d.yourVehicles}
            </h2>
            {vehicles.length === 0 ? (
              <figure className="mt-3 overflow-hidden rounded-2xl border border-line" aria-hidden="true">
                <LoopClip name="roadside" />
              </figure>
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
