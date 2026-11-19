"use client";

import { useEffect, useState } from "react";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { trackEvent } from "@/lib/client/analytics";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Billing section (owner spec, Nov 3 2026) — plan & billing on the
 * dashboard, for drivers and businesses alike.
 *
 * What it states, in plain words, all read from the account record via
 * /api/payments/status (the webhook keeps the record current): the
 * current plan, the subscription's status, and the period end — the
 * renewal date while active, the last day of access after a cancel.
 *
 * What it does: subscribers get ONE button — "Manage or cancel
 * anytime" — which opens the Stripe Billing Portal
 * (/api/payments/portal). Free accounts get the upgrade path instead
 * (Stripe Checkout, which surfaces card, Apple Pay, and Google Pay).
 * No guilt copy, no retention maze, no dark patterns — cancelling is
 * exactly as easy to find as upgrading. Mobile-first: one column,
 * every action a ≥48px target.
 *
 * Design pass #8 (2026-11-16): the section renders as a structured
 * card in the dashboard's professional system, and the current
 * plan's price is presented with the shared pricing typography —
 * the catalog's own price + period strings (components/PlanCards),
 * so the price here looks exactly like the price on /pricing.
 * Data, buttons, and flows are unchanged.
 *
 * Credit model (Stripe pass, 2026-11-18): the section also states the
 * diagnosis shelves — free diagnoses left, the monthly credit bucket,
 * purchased single credits — and drivers get BOTH purchase doors:
 * subscribe to Pro (100 credits a month) or buy ONE diagnosis credit.
 * The buy-one door is there for every driver, Pro subscribers
 * included (a top-up when the month's bucket runs dry). When Stripe
 * is not wired, the checkout attempt answers with the honest
 * not-wired message on the card — never a dead button.
 *
 * Billing-card polish (2026-11-19, owner verdict on the stacked
 * giant pill buttons: "they don't look professional"): the card now
 * mirrors the owner's Kreova pricing-card reference — the pattern he
 * holds up as MECHA's design north star (minimal, straight to the
 * point), in MECHA's own light blue/white palette. The current plan
 * reads like a plan card: name large and calm, the price big and
 * confident with its period small and muted under it, and the
 * status / credit lines as calm rows with small circled checks and
 * generous spacing. ONE purchase leads: the upgrade is a soft-tinted
 * highlighted sub-card carrying the single solid primary pill. The
 * buy-one diagnosis is a quiet outlined option in its own bordered
 * row, and "Manage or cancel anytime" is a small text link at the
 * bottom — housekeeping never shouts like a purchase. Data, flows,
 * prices, and copy are unchanged.
 *
 * Billing-card polish, round 2 (2026-11-19, owner reviewed the
 * round-1 card live and circled the buy-one block): a bordered row
 * with a pale outline pill still read as an afterthought next to
 * the Pro card. Kreova gives EVERY option the same card treatment,
 * so the single diagnosis is now a full sibling plan card in the
 * same family: name large, its note as the muted subtitle, the
 * price big from the pricing catalog (pricing.single) with its
 * period small under it, and ONE button. Per the owner's word the
 * button is SOLID — the same filled pill as the upgrade's, never a
 * washed-out outline; the hierarchy is carried by the cards
 * themselves (Pro highlighted with the accent border and first
 * position, Single on the plain soft tint). Both purchase cards
 * share one geometry: same radius, padding, border logic, price
 * size, and button. The upgrade card also gains its catalog badge
 * as the muted subtitle under its name, so the two cards read
 * line-for-line alike. Presentation only, again.
 */

interface BillingView {
  plan: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
}

interface CreditsView {
  freeUsed: number;
  freeLimit: number;
  freeRemaining: number;
  purchasedCredits: number | null;
  bucket: { limit: number; used: number; remaining: number } | null;
  trial?: {
    active: boolean;
    endsAt: string | null;
    daysLeft: number;
    endedReason: "time" | "credits" | null;
  } | null;
}

function RowCheck() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-[1px] shrink-0 text-accent"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function BillingSection({
  kind,
  fallbackPlan,
}: {
  kind: "driver" | "business";
  fallbackPlan: string;
}) {
  const { t } = useLocale();
  const b = t.wp6.billing;
  const [view, setView] = useState<BillingView | null>(null);
  const [credits, setCredits] = useState<CreditsView | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<"portal" | "checkout" | "credit" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<{ billing: BillingView; credits?: CreditsView | null }>(
        "/api/payments/status",
      );
      if (res.status === 200) {
        setView(res.data.billing);
        setCredits(res.data.credits ?? null);
      } else setUnavailable(true);
    })();
  }, []);

  const plan = view?.plan ?? fallbackPlan;
  const planLabel =
    plan === "pro"
      ? b.planPro
      : plan === "business"
        ? b.planBusiness
        : plan === "starter"
          ? b.planStarter
          : b.planFree;
  const isPaidPlan = plan === "pro" || plan === "business";
  // The plan's price, from the pricing catalog itself — the same
  // strings /pricing and the homepage cards render (pass #8).
  // Starter predates the catalog and shows its label alone.
  const planPrice =
    plan === "pro"
      ? { price: t.pricing.pro.price, period: t.pricing.pro.period }
      : plan === "business"
        ? { price: t.pricing.shops.price, period: t.pricing.shops.period }
        : plan === "free"
          ? { price: t.pricing.free.price, period: t.pricing.free.period }
          : null;

  const statusWord =
    view?.subscriptionStatus === "active"
      ? b.statusActive
      : view?.subscriptionStatus === "canceled"
        ? b.statusCanceled
        : view?.subscriptionStatus === "paused"
          ? b.statusPaused
          : null;
  const periodDate = view?.currentPeriodEnd
    ? new Date(view.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // The ONE upgrade offer, when there is one (2026-11-19 polish):
  // drivers on a free plan get the Pro card; businesses with no
  // billing account yet get the Shops card. Paid plans and
  // businesses already in Stripe get none — the manage link below
  // is their door. Name and price come from the same catalog
  // strings as everywhere else; only the presentation is new.
  const upgrade =
    view && !isPaidPlan
      ? kind === "driver"
        ? {
            name: b.planPro,
            badge: t.pricing.pro.badge,
            price: t.pricing.pro.price,
            period: t.pricing.pro.period,
            label: b.upgradePro,
            plan: "pro" as const,
          }
        : kind === "business" && !view.hasBillingAccount
          ? {
              name: b.planBusiness,
              badge: t.pricing.shops.badge,
              price: t.pricing.shops.price,
              period: t.pricing.shops.period,
              label: b.upgradeBusiness,
              plan: "business" as const,
            }
          : null
      : null;

  // Whether a purchase block renders above the manage link
  // (drivers always get the buy-one card; the upgrade card counts
  // too). Presentation only — it decides whether the manage link
  // needs its own divider above it.
  const hasPurchaseAction = kind === "driver" || upgrade !== null;

  async function openPortal() {
    setBusy("portal");
    setError(null);
    const res = await apiFetch<{ url: string }>("/api/payments/portal", { method: "POST" });
    if (res.status === 200 && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setBusy(null);
    setError(apiDetail(res.data, t.wp6.common.somethingWrong));
  }

  async function openCheckout(planToBuy: "pro" | "business" | "credit") {
    setBusy(planToBuy === "credit" ? "credit" : "checkout");
    setError(null);
    const res = await apiFetch<{ url: string }>("/api/payments/create-checkout", {
      method: "POST",
      body: JSON.stringify({ plan: planToBuy }),
    });
    if (res.status === 200 && res.data.url) {
      // Funnel (analytics pass): checkout actually started — the
      // session exists and the browser is leaving for Stripe.
      trackEvent("checkout_started", {
        product: planToBuy === "credit" ? "single_credit" : planToBuy,
      });
      window.location.href = res.data.url;
      return;
    }
    setBusy(null);
    setError(apiDetail(res.data, t.wp6.common.somethingWrong));
  }

  // Kreova geometry (2026-11-19 polish, round 2): ONE solid pill
  // for every purchase card — the upgrade and the single diagnosis
  // carry the exact same filled button (owner: "we have to have a
  // solid button. Just like the 9.99"). The cards themselves carry
  // the hierarchy; no purchase button is ever a pale outline.
  const buttonClass =
    "flex h-11 w-full items-center justify-center rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-bright disabled:opacity-60";
  const manageLinkClass =
    "inline-flex items-center py-1 text-sm font-medium text-accent-deep underline-offset-4 transition-colors duration-150 hover:underline disabled:opacity-60";

  const showCancelNote = Boolean(view?.cancelAtPeriodEnd && view.subscriptionStatus === "active");
  const hasFactRows = Boolean(statusWord || showCancelNote || credits);

  // The Shops free trial (2026-11-19), stated on the card while it
  // runs and plainly once it ends: days left + the end date from the
  // shop record (via the credits view), never a countdown invented
  // in the browser.
  const trial = kind === "business" ? (credits?.trial ?? null) : null;
  const trialEndDate =
    trial?.endsAt != null
      ? new Date(trial.endsAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;
  const showTrialRow = Boolean(trial && !isPaidPlan && (trial.active || trial.endedReason));
  const factRows = hasFactRows || showTrialRow;

  return (
    <section id="billing" className="mt-6 scroll-mt-24">
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-ink-1">{b.title}</h2>

        <p className="mt-5 text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
          {b.currentPlan}
        </p>
        <p className="mt-1.5 font-display text-2xl font-semibold text-ink-1">{planLabel}</p>
        {planPrice && (
          <p className="mt-3">
            <span className="tnum font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
              {planPrice.price}
            </span>
            <span className="mt-1.5 block text-sm text-ink-3">{planPrice.period}</span>
          </p>
        )}

        {view?.subscriptionStatus === "past_due" && (
          <p className="mt-4 text-sm font-medium text-ink-1">{b.statusPastDue}</p>
        )}

        {factRows && (
          <ul className="mt-5 space-y-2.5">
            {showTrialRow && trial && (
              <li className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <RowCheck />
                <span>
                  {trial.active
                    ? b.trialLine
                        .replace("{days}", String(trial.daysLeft))
                        .replace("{date}", trialEndDate ?? "")
                    : b.trialEndedLine}
                </span>
              </li>
            )}
            {statusWord && (
              <li className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <RowCheck />
                <span>
                  {statusWord}
                  {periodDate && (
                    <>
                      {" · "}
                      {view?.cancelAtPeriodEnd ? b.endsOn : b.renewsOn} {periodDate}
                    </>
                  )}
                </span>
              </li>
            )}
            {showCancelNote && (
              <li className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <RowCheck />
                <span>{b.cancelScheduledNote}</span>
              </li>
            )}
            {credits && (
              <li className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <RowCheck />
                <span>
                  {b.creditsFreeLine
                    .replace("{count}", String(credits.freeRemaining))
                    .replace("{limit}", String(credits.freeLimit))}
                </span>
              </li>
            )}
            {credits?.bucket && (
              <li className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <RowCheck />
                <span>
                  {b.creditsBucketLine
                    .replace("{count}", String(credits.bucket.remaining))
                    .replace("{limit}", String(credits.bucket.limit))}
                </span>
              </li>
            )}
            {credits && credits.purchasedCredits !== null && credits.purchasedCredits > 0 && (
              <li className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                <RowCheck />
                <span>{b.creditsSinglesLine.replace("{count}", String(credits.purchasedCredits))}</span>
              </li>
            )}
          </ul>
        )}

        {unavailable && <p className="mt-3 text-sm text-ink-2">{b.unavailable}</p>}

        {!unavailable && view && (kind === "driver" || view.hasBillingAccount || upgrade) && (
          <div className="mt-7 border-t border-line pt-7">
            {upgrade && (
              <div className="rounded-2xl border-2 border-accent bg-inset p-6">
                <p className="font-display text-lg font-semibold text-ink-1">{upgrade.name}</p>
                <p className="mt-1 text-sm text-ink-3">{upgrade.badge}</p>
                <p className="mt-4">
                  <span className="tnum font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
                    {upgrade.price}
                  </span>
                  <span className="mt-1.5 block text-sm text-ink-3">{upgrade.period}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void openCheckout(upgrade.plan)}
                  disabled={busy !== null}
                  className={`${buttonClass} mt-6`}
                >
                  {busy === "checkout" ? b.openingCheckout : upgrade.label}
                </button>
                <p className="mt-3 text-sm leading-relaxed text-ink-3">{b.upgradeNote}</p>
              </div>
            )}

            {kind === "driver" && (
              <div
                className={`rounded-2xl border border-line bg-inset p-6 ${upgrade ? "mt-5" : ""}`}
              >
                <p className="font-display text-lg font-semibold text-ink-1">
                  {t.pricing.single.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-3">{b.buyDiagnosisNote}</p>
                <p className="mt-4">
                  <span className="tnum font-display text-5xl font-semibold tracking-[-0.02em] text-ink-1">
                    {t.pricing.single.price}
                  </span>
                  <span className="mt-1.5 block text-sm text-ink-3">{t.pricing.single.period}</span>
                </p>
                <button
                  type="button"
                  onClick={() => void openCheckout("credit")}
                  disabled={busy !== null}
                  className={`${buttonClass} mt-6`}
                >
                  {busy === "credit" ? b.openingCheckout : b.buyDiagnosis}
                </button>
              </div>
            )}

            {view.hasBillingAccount && (
              <div className={hasPurchaseAction ? "mt-6 border-t border-line pt-5" : "mt-6"}>
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy !== null}
                  className={manageLinkClass}
                >
                  {busy === "portal" ? b.openingPortal : b.manageButton}
                </button>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{b.manageNote}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-ink-1" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
