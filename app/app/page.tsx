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
 * Design pass "Dashboard Tesla" (2026-11-16, owner: "reanalyze the
 * Tesla page again… make it similar"): the dashboard is rebuilt in
 * Tesla's design language — the vehicle IS the hero (its name as one
 * large, light heading over the full-width in-use film, no frame),
 * the free-diagnosis count is one large numeral with a quiet label
 * and a single hairline meter, and the quick actions are borderless
 * icon-over-label controls floating in open space. No cards, no
 * borders, no shadows, no explanatory sub-lines; sections are
 * separated by whitespace alone. Data, flows, and destinations are
 * unchanged from the tile pass.
 */

/** Action glyphs — MECHA line set (§1.6), drawn not emoji. */
function TileIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
  // True once the driver's first data load has resolved — the hero
  // shows the plain garage title until then, so the no-vehicle call
  // to action never flashes for a driver who has a car.
  const [driverLoaded, setDriverLoaded] = useState(false);
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
      setDriverLoaded(true);
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

  const heroVehicle = kind === "driver" && vehicles.length > 0 ? vehicles[0] : null;
  const heroTitle = heroVehicle
    ? (heroVehicle.nickname ?? `${heroVehicle.year} ${heroVehicle.make} ${heroVehicle.model}`)
    : kind === "business" && business
      ? (business.shopName ?? business.companyName ?? d.title)
      : d.title;

  return (
    <>
      <AppNav business={kind === "business"} />
      <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-20">
        {/* The hero: one focal point. For a driver with a vehicle,
            the vehicle is the hero — its name in one large, light
            heading over the full-width in-use film, no frame. */}
        <header className="text-center">
          {kind === "driver" && name && (
            <p className="text-sm text-ink-3">
              {d.welcomeBack}, {name}
            </p>
          )}
          <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-ink-1 sm:text-6xl">
            {heroTitle}
          </h1>
          {heroVehicle?.nickname && (
            <p className="mt-3 text-lg text-ink-3">
              {heroVehicle.year} {heroVehicle.make} {heroVehicle.model}
            </p>
          )}
          {kind === "business" && business && (
            <p className="mt-3 text-lg text-ink-3">{d.businessProfile}</p>
          )}
        </header>

        {kind === "driver" && (
          <>
            {heroVehicle ? (
              <Link
                href="/app/vault"
                aria-label={`${heroTitle} — ${d.viewVault}`}
                className="mt-12 block"
              >
                <LoopClip name="roadside" />
              </Link>
            ) : (
              <figure className="mt-12" aria-hidden="true">
                <LoopClip name="roadside" />
              </figure>
            )}
            {driverLoaded && vehicles.length === 0 && (
              <div className="mt-10 text-center">
                <Link
                  href="/app/vault"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
                >
                  {d.addVehicle}
                </Link>
              </div>
            )}
          </>
        )}

        {kind === "driver" && quota && (
          <section className="mt-20 text-center" role="status" aria-live="polite">
            {quota.plan === "pro" ? (
              <p className="font-display text-2xl font-medium text-ink-1">{d.quotaPro}</p>
            ) : (
              <>
                <p className="tnum font-display text-8xl font-medium leading-none text-ink-1">
                  {quota.remaining}
                </p>
                <p className="mt-3 text-base text-ink-3">
                  {d.quotaOf} {quota.limit} {d.quotaLeft}
                </p>
                {/* The meter: one hairline bar, filled to what remains. */}
                <div
                  className="mx-auto mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-inset"
                  aria-hidden="true"
                >
                  <div
                    className="bar-anim h-full rounded-full bg-accent"
                    style={{
                      width: `${
                        quota.limit
                          ? Math.round(((quota.remaining ?? 0) / quota.limit) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {kind === "driver" && phoneMissing && (
          <section className="mx-auto mt-16 w-full max-w-xl text-center">
            <h2 className="font-display text-2xl font-medium text-ink-1">
              {t.auth.completeProfile.bannerTitle}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-2">
              {t.auth.completeProfile.bannerBody}
            </p>
            <Link
              href="/app/complete-profile"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
            >
              {t.auth.completeProfile.bannerCta}
            </Link>
          </section>
        )}

        {kind === "driver" && (emailVerified === false || verifyState === "done") && (
          <section className="mx-auto mt-16 w-full max-w-xl text-center">
            <h2 className="font-display text-2xl font-medium text-ink-1">{d.verifyTitle}</h2>
            {verifyState === "done" ? (
              <p className="mt-3 text-base text-verdict-fair" role="status">
                {d.verifyDone}
              </p>
            ) : (
              <>
                <p className="mt-3 text-base leading-relaxed text-ink-2">{d.verifyBody}</p>
                {verifyState === "sent" && (
                  <p className="mt-3 text-base text-ink-1" role="status">
                    {d.verifySent}
                  </p>
                )}
                {verifyState === "unavailable" && (
                  <p className="mt-3 text-base text-ink-2" role="status">
                    {d.verifyUnavailable}
                  </p>
                )}
                {verifyState === "error" && (
                  <p className="mt-3 text-base text-verdict-rip" role="alert">
                    {verifyDetail}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
                    className="btn-ghost h-12 rounded-full px-6 text-base font-semibold text-ink-1 disabled:opacity-60"
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
            <h2 className="mt-24 text-center font-display text-3xl font-medium text-ink-1 sm:text-4xl">
              {d.quickActions}
            </h2>
            <div className="mt-12 grid grid-cols-3 gap-x-2 gap-y-10 lg:grid-cols-6">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex flex-col items-center gap-3 px-1 py-2 text-center"
                >
                  <span className="text-ink-1 transition-colors group-hover:text-accent">
                    <TileIcon>{a.icon}</TileIcon>
                  </span>
                  <span className="text-sm font-medium leading-snug text-ink-2 transition-colors group-hover:text-ink-1">
                    {a.title}
                  </span>
                </Link>
              ))}
            </div>

            {vehicles.length > 1 && (
              <>
                <h2 className="mt-24 text-center font-display text-3xl font-medium text-ink-1 sm:text-4xl">
                  {d.yourVehicles}
                </h2>
                <ul className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-6 text-center">
                  {vehicles.slice(1).map((v) => (
                    <li key={v.id}>
                      <Link
                        href="/app/vault"
                        className="font-display text-xl font-medium text-ink-1 transition-colors hover:text-accent"
                      >
                        {v.nickname ? `${v.nickname} — ` : ""}
                        {v.year} {v.make} {v.model}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {vehicles.length > 0 && (
              <div className="mt-12 text-center">
                <Link
                  href="/app/vault"
                  className="btn-ghost inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-semibold text-ink-1"
                >
                  {d.addVehicle}
                </Link>
              </div>
            )}

            <h2 className="mt-24 text-center font-display text-3xl font-medium text-ink-1 sm:text-4xl">
              {d.recentDiagnoses}
            </h2>
            {diagnoses.length === 0 ? (
              <p className="mt-6 text-center text-base text-ink-3">{d.noDiagnoses}</p>
            ) : (
              <ul className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-8 text-center">
                {diagnoses.map((diag) => (
                  <li key={diag.id}>
                    <span className="text-sm text-ink-3">
                      {new Date(diag.createdAt).toLocaleDateString()}
                      {diag.aiResult?.severity ? ` · ${diag.aiResult.severity}` : ""}
                    </span>
                    <span className="mt-1 block text-lg text-ink-1">
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
          <section className="mx-auto mt-16 w-full max-w-xl">
            <dl className="flex flex-col gap-4 text-base">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{d.businessPlan}</dt>
                <dd className="font-medium text-ink-1">{business.plan}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{t.wp6.business.phone}</dt>
                <dd className="font-medium text-ink-1">{business.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">{t.wp6.business.zip}</dt>
                <dd className="font-medium text-ink-1">{business.zip ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/app/messages"
                className="flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
              >
                {d.businessMessages}
              </Link>
              <Link
                href="/app/nearby"
                className="btn-ghost flex h-12 items-center justify-center rounded-full px-8 text-base font-semibold text-ink-1"
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
