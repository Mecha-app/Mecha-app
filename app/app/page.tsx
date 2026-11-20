"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { BillingSection } from "@/components/BillingSection";
import { BusinessAvatar } from "@/components/BusinessAvatar";
import { CheckoutReturnTracker } from "@/components/CheckoutReturnTracker";
import { LoopClip } from "@/components/LoopClip";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getStoredUser, getToken, saveSession, type StoredUser } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app — the cockpit (WP6). For a driver: the free-diagnosis meter
 * (always visible, always server-stated — the owner's rule), their
 * vehicles, recent diagnoses, and the quick actions that ARE the
 * product: Diagnose, Find a shop, Find a tow, Marketplace.
 * For a shop/towing account: their business profile + plan state.
 * Mobile-first: one column, every action a ≥48px target.
 *
 * Design pass #8 (2026-11-16, owner verdict on the pass #3 bare
 * rebuild: "I don't like this dashboard at all at all"): the
 * dashboard is PROFESSIONAL and STRUCTURED — clean white cards
 * with clear headings, like a real company's app. The vehicle is
 * a proper summary card (film, name, the specs on file, a clear
 * Health Vault action); the free-diagnosis count is a labeled
 * card (count in context, a clean meter, what happens at zero,
 * the upgrade path); the quick actions are labeled cards with
 * icons and one-line descriptions; recent diagnoses are a tidy
 * list card; plan & billing is a card presenting the price with
 * the shared pricing typography. Every data source, count, link,
 * and flow is identical to the tile/Tesla passes — presentation
 * only, in the pass #7 light/blue theme.
 *
 * Sign-in fix (owner, 2026-11-16, folded into pass #8): sign-in
 * now lands HERE for every account — the Google completion page
 * no longer walls phone-less accounts into /app/complete-profile,
 * and the email login's default destination is this dashboard.
 * The phone number is collected by the non-blocking card below:
 * shown only when no number is on file, completable in place via
 * /api/auth/complete-phone, dismissible with "Not now".
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

/** The one card shell + heading every dashboard section shares. */
const CARD = "rounded-2xl border border-line bg-surface p-6 sm:p-8";

function CardHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-semibold text-ink-1">{children}</h2>;
}

interface QuotaView {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  credits?: number;
  bucket?: { limit: number; used: number; remaining: number } | null;
  canDiagnose: boolean;
}

interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  engine: string | null;
  mileage: number | null;
  color: string | null;
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
  logoUrl?: string | null;
  galleryUrls?: string[];
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
  // True once the driver's first data load has resolved — the
  // no-vehicle call to action shows only after it, so it never
  // flashes for a driver who has a car.
  const [driverLoaded, setDriverLoaded] = useState(false);
  // Email verification (0011, SOFT GATE): the banner shows until the
  // server says the email is verified; nothing else waits on it.
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  // Phone completion (social login package): a Google-created account
  // starts phone-less. Since the owner's 2026-11-16 sign-in fix the
  // number is collected by a NON-BLOCKING card on this dashboard —
  // completable in place (the same /api/auth/complete-phone save the
  // complete-profile page uses) or dismissed — never a wall between
  // sign-in and the account. Diagnoses stay locked until the number
  // is on file (the identity is email AND phone).
  const [phoneMissing, setPhoneMissing] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneState, setPhoneState] = useState<"idle" | "saving" | "error">("idle");
  const [phoneDetail, setPhoneDetail] = useState("");
  const [phoneDismissed, setPhoneDismissed] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyState, setVerifyState] = useState<
    "idle" | "working" | "done" | "sent" | "unavailable" | "error"
  >("idle");
  const [verifyDetail, setVerifyDetail] = useState("");

  // Business phone edit + logo (owner order 2026-11-20: the number
  // drivers call and the logo drivers see are the shop's to manage
  // right here in the dashboard).
  const [bizPhoneEdit, setBizPhoneEdit] = useState(false);
  const [bizPhoneDraft, setBizPhoneDraft] = useState("");
  const [bizPhoneState, setBizPhoneState] = useState<"idle" | "saving" | "error">("idle");
  const [bizPhoneDetail, setBizPhoneDetail] = useState("");
  const [logoState, setLogoState] = useState<"idle" | "saving" | "error">("idle");
  const [logoDetail, setLogoDetail] = useState("");

  async function refreshBusiness() {
    const res = await apiFetch<{ business: Business }>("/api/business/me");
    if (res.status === 200) setBusiness(res.data.business);
  }

  async function saveBizPhone(e: FormEvent) {
    e.preventDefault();
    setBizPhoneState("saving");
    const res = await apiFetch<{ business: Business }>("/api/business/me", {
      method: "PATCH",
      body: JSON.stringify({ phone: bizPhoneDraft }),
    });
    if (res.status === 200) {
      setBusiness(res.data.business);
      setBizPhoneEdit(false);
      setBizPhoneState("idle");
    } else {
      setBizPhoneState("error");
      setBizPhoneDetail(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  async function onLogoFile(file: File) {
    setLogoState("saving");
    setLogoDetail("");
    const form = new FormData();
    form.append("photo", file);
    const token = getToken();
    const res = await fetch("/api/business/logo", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.ok) {
      await refreshBusiness();
      setLogoState("idle");
    } else {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      setLogoState("error");
      setLogoDetail(
        typeof data.detail === "string" && data.detail
          ? data.detail
          : t.wp6.common.somethingWrong,
      );
    }
  }

  async function onRemoveLogo() {
    setLogoState("saving");
    setLogoDetail("");
    const res = await apiFetch("/api/business/logo", { method: "DELETE" });
    if (res.status === 200) {
      await refreshBusiness();
      setLogoState("idle");
    } else {
      setLogoState("error");
      setLogoDetail(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  async function onGalleryFile(file: File) {
    setLogoState("saving");
    setLogoDetail("");
    const form = new FormData();
    form.append("photo", file);
    const token = getToken();
    const res = await fetch("/api/business/gallery", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.ok) {
      await refreshBusiness();
      setLogoState("idle");
    } else {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      setLogoState("error");
      setLogoDetail(
        typeof data.detail === "string" && data.detail
          ? data.detail
          : t.wp6.common.somethingWrong,
      );
    }
  }

  async function onRemoveGallery(url: string) {
    const uploadId = url.split("/").pop();
    if (!uploadId) return;
    setLogoState("saving");
    setLogoDetail("");
    const res = await apiFetch(`/api/business/gallery/${uploadId}`, { method: "DELETE" });
    if (res.status === 200) {
      await refreshBusiness();
      setLogoState("idle");
    } else {
      setLogoState("error");
      setLogoDetail(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

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
    const loadDriver = async () => {
      const [me, veh, diag] = await Promise.all([
        apiFetch<{
          user: {
            id: string;
            name: string;
            email: string;
            emailVerified: boolean;
            phone: string | null;
            plan: string;
            type: string;
          };
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
        // Session heal (2026-11-16 persistence fix): a Google
        // sign-in lands with the session cookie only — no stored
        // profile mirror. Rebuild the mirror from the account
        // record so the other app screens see the profile they
        // expect (kind detection, the vault, messages).
        const token = getToken();
        if (token && !getStoredUser()) {
          const u = me.data.user;
          saveSession(token, {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            plan: u.plan,
            type: u.type,
          });
        }
      }
      if (veh.status === 200) setVehicles(veh.data.vehicles);
      if (diag.status === 200) setDiagnoses(diag.data.diagnoses);
      setDriverLoaded(true);
    };
    void loadDriver();
    // Freshness (2026-11-17): a dashboard left open in a tab while a
    // diagnosis completes elsewhere kept showing its mount-time
    // snapshot — the recent list read "No diagnoses yet" immediately
    // after a finished run that had in fact saved. Re-fetch when the
    // driver comes back to this tab (visibility or focus).
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadDriver();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
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

  // The phone card's save: the SAME endpoint and session refresh
  // the /app/complete-profile page uses — completed in place, the
  // card simply goes away. A number that belongs to a different
  // account answers the server's honest conflict, shown verbatim.
  async function onSavePhone(e: FormEvent) {
    e.preventDefault();
    setPhoneState("saving");
    setPhoneDetail("");
    const res = await apiFetch<{ token: string; user: StoredUser }>("/api/auth/complete-phone", {
      method: "POST",
      body: JSON.stringify({ phone: phoneValue }),
    });
    if (res.status === 200 && res.data.token && res.data.user) {
      saveSession(res.data.token, res.data.user);
      setPhoneMissing(false);
      return;
    }
    setPhoneState("error");
    setPhoneDetail(apiDetail(res.data, t.auth.completeProfile.failed));
  }

  const actions = [
    { href: "/app/diagnose", title: d.actionDiagnose, sub: d.actionDiagnoseSub, icon: ACTION_ICONS.diagnose },
    { href: "/app/nearby?kind=shops", title: d.actionShop, sub: d.actionShopSub, icon: ACTION_ICONS.shop },
    { href: "/app/nearby?kind=towing", title: d.actionTow, sub: d.actionTowSub, icon: ACTION_ICONS.tow },
    { href: "/marketplace", title: d.actionMarketplace, sub: d.actionMarketplaceSub, icon: ACTION_ICONS.marketplace },
    { href: "/sell", title: d.actionSell, sub: d.actionSellSub, icon: ACTION_ICONS.sell },
    { href: "/app/vault", title: t.wp6.vault.title, sub: d.actionVaultSub, icon: ACTION_ICONS.vault },
  ];

  const heroVehicle = kind === "driver" && vehicles.length > 0 ? vehicles[0] : null;
  const vehicleName = heroVehicle
    ? (heroVehicle.nickname ?? `${heroVehicle.year} ${heroVehicle.make} ${heroVehicle.model}`)
    : null;
  // The specs already on file for the vehicle (the vault record) —
  // shown when they exist, absent when they don't.
  const vehicleSpecs = heroVehicle
    ? [
        { label: t.wp6.vault.trim, value: heroVehicle.trim },
        { label: t.wp6.vault.engine, value: heroVehicle.engine },
        {
          label: t.wp6.vault.mileage,
          value: heroVehicle.mileage !== null ? `${heroVehicle.mileage.toLocaleString()} mi` : null,
        },
        { label: t.wp6.vault.color, value: heroVehicle.color },
      ].filter((s): s is { label: string; value: string } => Boolean(s.value))
    : [];
  const headerTitle =
    kind === "business" && business
      ? (business.shopName ?? business.companyName ?? d.title)
      : d.title;

  return (
    <>
      <AppNav business={kind === "business"} />
      {/* Stripe returns Pro and Shops subscribers to this page
          (?checkout=success) — the purchase_completed event. The two
          plans share the return URL, so the product is the honest
          "subscription" (components/CheckoutReturnTracker). */}
      <CheckoutReturnTracker product="subscription" />
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
        <header>
          {kind === "driver" && name && (
            <p className="text-sm text-ink-3">
              {d.welcomeBack}, {name}
            </p>
          )}
          <h1 className="mt-2 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-ink-1 sm:text-5xl">
            {headerTitle}
          </h1>
        </header>

        {kind === "driver" && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
            {heroVehicle ? (
              <Link
                href="/app/vault"
                aria-label={`${vehicleName} — ${d.viewVault}`}
                className="block"
              >
                <LoopClip name="roadside" />
              </Link>
            ) : (
              <figure aria-hidden="true">
                <LoopClip name="roadside" />
              </figure>
            )}
            <div className="p-6 sm:p-8">
              {heroVehicle ? (
                <>
                  <h2 className="font-display text-2xl font-semibold text-ink-1 sm:text-3xl">
                    {vehicleName}
                  </h2>
                  {heroVehicle.nickname && (
                    <p className="mt-1.5 text-base text-ink-3">
                      {heroVehicle.year} {heroVehicle.make} {heroVehicle.model}
                    </p>
                  )}
                  {vehicleSpecs.length > 0 && (
                    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
                      {vehicleSpecs.map((s) => (
                        <div key={s.label}>
                          <dt className="text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
                            {s.label}
                          </dt>
                          <dd className="mt-1 font-medium text-ink-1">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="mt-7">
                    <Link
                      href="/app/vault"
                      className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
                    >
                      {d.viewVault}
                    </Link>
                  </div>
                </>
              ) : (
                driverLoaded && (
                  <>
                    <p className="text-base leading-relaxed text-ink-2">{d.noVehicles}</p>
                    <div className="mt-6">
                      <Link
                        href="/app/vault"
                        className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
                      >
                        {d.addVehicle}
                      </Link>
                    </div>
                  </>
                )
              )}
            </div>
          </section>
        )}

        {kind === "driver" && quota && (
          <section className={`${CARD} mt-6`} role="status" aria-live="polite">
            <CardHeading>{d.quotaTitle}</CardHeading>
            {quota.plan === "pro" ? (
              <>
                <p className="mt-4 font-display text-2xl font-medium text-ink-1">{d.quotaPro}</p>
                {quota.bucket && (
                  <p className="mt-2 text-base text-ink-2">
                    <span className="tnum font-semibold text-ink-1">{quota.bucket.remaining}</span>{" "}
                    {d.quotaOf} {quota.bucket.limit} {d.quotaBucketLeft}
                  </p>
                )}
                {quota.credits !== undefined && quota.credits > 0 && (
                  <p className="mt-1 text-base text-ink-2">
                    <span className="tnum font-semibold text-ink-1">{quota.credits}</span>{" "}
                    {d.quotaSinglesLeft}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
                  <span className="tnum font-display text-6xl font-semibold leading-none text-ink-1">
                    {quota.remaining}
                  </span>
                  <span className="text-base text-ink-3">
                    {d.quotaOf} {quota.limit} {d.quotaLeft}
                  </span>
                </p>
                {/* The meter: a clean bar, filled to what remains. */}
                <div
                  className="mt-5 h-2 w-full overflow-hidden rounded-full bg-inset"
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
                <p className="mt-4 text-sm leading-relaxed text-ink-2">{d.quotaNote}</p>
                <div className="mt-6">
                  <Link
                    href="#billing"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
                  >
                    {d.quotaUpgrade}
                  </Link>
                </div>
              </>
            )}
          </section>
        )}

        {kind === "driver" && phoneMissing && !phoneDismissed && (
          <section className={`${CARD} mt-6`}>
            <CardHeading>{t.auth.completeProfile.bannerTitle}</CardHeading>
            <p className="mt-3 text-base leading-relaxed text-ink-2">
              {t.auth.completeProfile.bannerBody}
            </p>
            <form onSubmit={onSavePhone} className="mt-6" noValidate>
              <label
                htmlFor="dashboard-phone"
                className="block text-sm font-medium text-ink-2"
              >
                {t.auth.completeProfile.phoneLabel}
              </label>
              <input
                id="dashboard-phone"
                type="tel"
                className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
                autoComplete="tel"
                inputMode="tel"
                value={phoneValue}
                onChange={(e) => setPhoneValue(e.target.value)}
                required
              />
              {phoneState === "error" && (
                <p className="mt-3 text-base text-verdict-rip" role="alert">
                  {phoneDetail}
                </p>
              )}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={phoneState === "saving" || phoneValue.trim().length === 0}
                  className="h-12 rounded-full bg-accent px-8 text-base font-semibold text-accent-ink disabled:opacity-60"
                >
                  {phoneState === "saving"
                    ? t.auth.completeProfile.saving
                    : t.auth.completeProfile.bannerCta}
                </button>
                <button
                  type="button"
                  onClick={() => setPhoneDismissed(true)}
                  className="btn-ghost h-12 rounded-full px-8 text-base font-semibold text-ink-1"
                >
                  {t.auth.completeProfile.bannerDismiss}
                </button>
              </div>
            </form>
          </section>
        )}

        {kind === "driver" && (emailVerified === false || verifyState === "done") && (
          <section className={`${CARD} mt-6`}>
            <CardHeading>{d.verifyTitle}</CardHeading>
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
            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold text-ink-1">{d.quickActions}</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
                {actions.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-inset text-accent">
                      <TileIcon>{a.icon}</TileIcon>
                    </span>
                    <span className="mt-4 block font-display text-base font-semibold leading-snug text-ink-1">
                      {a.title}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-ink-3">{a.sub}</span>
                  </Link>
                ))}
              </div>
            </section>

            {vehicles.length > 1 && (
              <section className={`${CARD} mt-6`}>
                <CardHeading>{d.yourVehicles}</CardHeading>
                <ul className="mt-2 divide-y divide-line">
                  {vehicles.slice(1).map((v) => (
                    <li key={v.id}>
                      <Link
                        href="/app/vault"
                        className="block py-4 font-display text-lg font-medium text-ink-1 transition-colors hover:text-accent"
                      >
                        {v.nickname ? `${v.nickname} — ` : ""}
                        {v.year} {v.make} {v.model}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Link
                    href="/app/vault"
                    className="btn-ghost inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-semibold text-ink-1"
                  >
                    {d.addVehicle}
                  </Link>
                </div>
              </section>
            )}
            {vehicles.length === 1 && (
              <div className="mt-6">
                <Link
                  href="/app/vault"
                  className="btn-ghost inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-semibold text-ink-1"
                >
                  {d.addVehicle}
                </Link>
              </div>
            )}

            <section className={`${CARD} mt-6`}>
              <CardHeading>{d.recentDiagnoses}</CardHeading>
              {!driverLoaded ? (
                // First load still in flight: a loading line, never
                // the empty state — "No diagnoses yet" may only
                // appear once a completed fetch returned none
                // (Pass #20b: the empty-state flicker fix).
                <p className="mt-3 text-base text-ink-3" role="status">
                  Loading…
                </p>
              ) : diagnoses.length === 0 ? (
                <>
                  <p className="mt-3 text-base text-ink-3">{d.noDiagnoses}</p>
                  <div className="mt-6">
                    <Link
                      href="/app/diagnose"
                      className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
                    >
                      {d.actionDiagnose}
                    </Link>
                  </div>
                </>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {diagnoses.map((diag) => (
                    <li key={diag.id}>
                      {/* Every entry opens its saved diagnosis
                          (Pass #20b) — the detail view is where the
                          share link and the outcome prompt live for
                          a past run, not only the fresh one. */}
                      <Link
                        href={`/app/diagnoses/${diag.id}`}
                        className="block py-4 transition-colors hover:text-accent"
                      >
                        <span className="text-sm text-ink-3">
                          {new Date(diag.createdAt).toLocaleDateString()}
                          {diag.aiResult?.severity ? ` · ${diag.aiResult.severity}` : ""}
                        </span>
                        <span className="mt-1 block text-base text-ink-1">
                          {diag.problemText ?? diag.aiResult?.diagnosis ?? ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {quota && <BillingSection kind="driver" fallbackPlan={quota.plan} />}
          </>
        )}

        {kind === "business" && business && (
          <section className={`${CARD} mt-8`}>
            <CardHeading>{d.businessProfile}</CardHeading>
            <dl className="mt-4 flex flex-col divide-y divide-line text-base">
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-ink-3">{d.businessPlan}</dt>
                <dd className="font-medium text-ink-1">{business.plan}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-ink-3">{t.wp6.business.phone}</dt>
                <dd className="flex items-center gap-3">
                  <span className="font-medium text-ink-1">{business.phone}</span>
                  {!bizPhoneEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setBizPhoneDraft(business.phone);
                        setBizPhoneState("idle");
                        setBizPhoneEdit(true);
                      }}
                      className="text-sm font-semibold text-accent"
                    >
                      {t.wp6.common.edit}
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-ink-3">{t.wp6.business.zip}</dt>
                <dd className="font-medium text-ink-1">{business.zip ?? "—"}</dd>
              </div>
            </dl>
            {bizPhoneEdit && (
              <form onSubmit={saveBizPhone} className="mt-4 flex flex-col gap-2">
                <label htmlFor="biz-phone" className="text-sm font-medium text-ink-2">
                  {t.wp6.business.phone}
                </label>
                <div className="flex gap-2">
                  <input
                    id="biz-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={bizPhoneDraft}
                    onChange={(e) => setBizPhoneDraft(e.target.value)}
                    className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1"
                  />
                  <button
                    type="submit"
                    disabled={bizPhoneState === "saving" || bizPhoneDraft.trim().length === 0}
                    className="flex h-12 shrink-0 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-50"
                  >
                    {t.wp6.common.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBizPhoneEdit(false)}
                    className="flex h-12 shrink-0 items-center justify-center rounded-full border border-line px-5 text-base font-semibold text-ink-1"
                  >
                    {t.wp6.common.cancel}
                  </button>
                </div>
                {bizPhoneState === "error" && (
                  <p className="text-sm text-danger">{bizPhoneDetail}</p>
                )}
              </form>
            )}
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-sm font-medium text-ink-2">{t.wp6.business.logoLabel}</p>
              <div className="mt-3 flex items-center gap-4">
                <BusinessAvatar
                  name={business.shopName ?? business.companyName ?? business.email}
                  logoUrl={business.logoUrl ?? null}
                />
                <div className="flex flex-wrap gap-2">
                  <label
                    className="flex h-11 cursor-pointer items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink"
                    aria-disabled={logoState === "saving"}
                  >
                    {business.logoUrl ? t.wp6.business.logoReplace : t.wp6.business.logoAdd}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={logoState === "saving"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void onLogoFile(file);
                      }}
                    />
                  </label>
                  {business.logoUrl && (
                    <button
                      type="button"
                      onClick={() => void onRemoveLogo()}
                      disabled={logoState === "saving"}
                      className="flex h-11 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold text-ink-1 disabled:opacity-50"
                    >
                      {t.wp6.business.logoRemove}
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-3">{t.wp6.business.logoHint}</p>
              {logoState === "error" && <p className="mt-1 text-sm text-danger">{logoDetail}</p>}
              <div className="mt-5">
                <p className="text-sm font-medium text-ink-2">{t.wp6.business.galleryLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(business.galleryUrls ?? []).map((url) => (
                    <span key={url} className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      <button
                        type="button"
                        aria-label={t.wp6.common.delete}
                        disabled={logoState === "saving"}
                        onClick={() => void onRemoveGallery(url)}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(business.galleryUrls ?? []).length < 4 && (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line text-2xl text-ink-3">
                      +
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={logoState === "saving"}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void onGalleryFile(file);
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-3">{t.wp6.business.galleryHint}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {business.type === "shop" && (
                <Link
                  href="/app/diagnose"
                  className="flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-ink"
                >
                  {d.businessDiagnose}
                </Link>
              )}
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
