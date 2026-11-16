"use client";

import { useEffect, useState } from "react";
import { apiDetail, apiFetch } from "@/lib/client/api";
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
 */

interface BillingView {
  plan: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
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
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState<"portal" | "checkout" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<{ billing: BillingView }>("/api/payments/status");
      if (res.status === 200) setView(res.data.billing);
      else setUnavailable(true);
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

  async function openCheckout() {
    setBusy("checkout");
    setError(null);
    const planToBuy = kind === "business" ? "business" : "pro";
    const res = await apiFetch<{ url: string }>("/api/payments/create-checkout", {
      method: "POST",
      body: JSON.stringify({ plan: planToBuy }),
    });
    if (res.status === 200 && res.data.url) {
      window.location.href = res.data.url;
      return;
    }
    setBusy(null);
    setError(apiDetail(res.data, t.wp6.common.somethingWrong));
  }

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-ink-2">{b.title}</h2>
      <div className="mt-3 rounded-2xl border border-line bg-surface px-5 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-base text-ink-2">{b.currentPlan}</span>
          <span className="font-display text-xl font-semibold text-ink-1">{planLabel}</span>
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

        {unavailable && <p className="mt-3 text-base text-ink-2">{b.unavailable}</p>}

        {!unavailable && view?.hasBillingAccount && (
          <>
            <button
              type="button"
              onClick={openPortal}
              disabled={busy !== null}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
            >
              {busy === "portal" ? b.openingPortal : b.manageButton}
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.manageNote}</p>
          </>
        )}

        {!unavailable && view && !view.hasBillingAccount && !isPaidPlan && (
          <>
            <button
              type="button"
              onClick={openCheckout}
              disabled={busy !== null}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-60"
            >
              {busy === "checkout"
                ? b.openingCheckout
                : kind === "business"
                  ? b.upgradeBusiness
                  : b.upgradePro}
            </button>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{b.upgradeNote}</p>
          </>
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
