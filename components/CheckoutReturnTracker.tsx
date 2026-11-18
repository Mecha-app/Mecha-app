"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/client/analytics";
import type { CheckoutProduct } from "@/lib/analytics";

/**
 * The purchase_completed half of the funnel (analytics pass,
 * 2026-11-18). Stripe returns a finished buyer to a success URL —
 * /app/diagnose?checkout=success for the single diagnosis credit,
 * /app?checkout=success for the Pro and Shops subscriptions (the two
 * share one return URL, so the dashboard reports the honest
 * "subscription"; the credit return names its own product). This
 * tracker, mounted on those two pages, fires the event exactly once
 * per return: a sessionStorage mark survives the remounts and
 * refreshes of the same return, and the parameter is stripped from
 * the address bar so a later refresh or share cannot re-fire it.
 * No parameter, no event — an ordinary visit measures nothing here.
 */
export function CheckoutReturnTracker({ product }: { product: CheckoutProduct }) {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("checkout") !== "success") return;
      const mark = `mecha-purchase-tracked:${product}`;
      if (sessionStorage.getItem(mark)) return;
      sessionStorage.setItem(mark, "1");
      trackEvent("purchase_completed", { product });
      url.searchParams.delete("checkout");
      window.history.replaceState(null, "", url.toString());
    } catch {
      // A blocked storage or history API costs one event, never an error.
    }
  }, [product]);
  return null;
}
