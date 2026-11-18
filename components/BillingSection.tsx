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

  const buttonClass =
    "flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60 sm:w-auto sm:min-w-[16rem]";
  const secondaryButtonClass =
    "flex h-12 w-full items-center justify-center rounded-full border border-line bg-surface px-6 text-base font-semibold text-ink-1 disabled:opacity-60 sm:w-auto sm:min-w-[16rem]";

  return (
    <section id="billing" className="mt-6 scroll-mt-24">
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-ink-1">{b.title}</h2>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-eyebrow text-ink-3">
          {b.currentPlan}
        </p>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="font-display text-2xl font-semibold text-ink-1">{planLabel}</p>
          {planPrice && (
            <p>
              <span className="tnum font-display text-2xl font-semibold text-ink-1">
                {planPrice.price}
              </span>{" "}
              <span className="text-sm text-ink-3">{planPrice.period}</span>
            </p>
          )}
        </div>

        {view?.subscriptionStatus === "past_due" && (
          <p className="mt-3 text-base font-medium text-ink-1">{b.statusPastDue}</p>
        )}
        {statusWord && (
          <p className="mt-3 text-base text-ink-2">
            {statusWord}
            {periodDate && (
              <>
                {" · "}
                {view?.cancelAtPeriodEnd ? b.endsOn : b.renewsOn} {periodDate}
              </>
            )}
          </p>
        )}
        {view?.cancelAtPeriodEnd && view.subscriptionStatus === "active" && (
          <p className="mt-2 text-base text-ink-2">{b.cancelScheduledNote}</p>
        )}

        {credits && (
          <div className="mt-4 space-y-1 text-base text-ink-2">
            <p>
              {b.creditsFreeLine
                .replace("{count}", String(credits.freeRemaining))
                .replace("{limit}", String(credits.freeLimit))}
            </p>
            {credits.bucket && (
              <p>
                {b.creditsBucketLine
                  .replace("{count}", String(credits.bucket.remaining))
                  .replace("{limit}", String(credits.bucket.limit))}
              </p>
            )}
            {credits.purchasedCredits !== null && credits.purchasedCredits > 0 && (
              <p>{b.creditsSinglesLine.replace("{count}", String(credits.purchasedCredits))}</p>
            )}
          </div>
        )}

        {unavailable && <p className="mt-3 text-base text-ink-2">{b.unavailable}</p>}

        {!unavailable && view?.hasBillingAccount && (
          <>
            <button
              type="button"
              onClick={openPortal}
              disabled={busy !== null}
              className={`mt-6 ${buttonClass}`}
            >
              {busy === "portal" ? b.openingPortal : b.manageButton}
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.manageNote}</p>
          </>
        )}

        {!unavailable && view && kind === "business" && !view.hasBillingAccount && !isPaidPlan && (
          <>
            <button
              type="button"
              onClick={() => void openCheckout("business")}
              disabled={busy !== null}
              className={`mt-6 ${buttonClass}`}
            >
              {busy === "checkout" ? b.openingCheckout : b.upgradeBusiness}
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.upgradeNote}</p>
          </>
        )}

        {!unavailable && view && kind === "driver" && (
          <div className="mt-6 flex flex-col gap-3">
            {!isPaidPlan && (
              <div>
                <button
                  type="button"
                  onClick={() => void openCheckout("pro")}
                  disabled={busy !== null}
                  className={buttonClass}
                >
                  {busy === "checkout" ? b.openingCheckout : b.upgradePro}
                </button>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.upgradeNote}</p>
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => void openCheckout("credit")}
                disabled={busy !== null}
                className={isPaidPlan ? buttonClass : secondaryButtonClass}
              >
                {busy === "credit" ? b.openingCheckout : b.buyDiagnosis}
              </button>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.buyDiagnosisNote}</p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-base text-ink-1" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
