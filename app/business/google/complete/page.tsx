"use client";

import { useEffect } from "react";
import { AppNav } from "@/components/AppNav";
import { saveSession } from "@/lib/client/auth";
import { RETURN_TO_KEY } from "@/lib/server/scan";

/**
 * /business/google/complete — the landing for a successful BUSINESS
 * Google sign-in (item 10, 2026-11-20). The callback delivers the
 * token + public business in the URL FRAGMENT (the driver flow's
 * pattern — fragments are never sent to a server, never logged);
 * this page stores the session exactly like the business password
 * sign-in does (saveSession — which also mirrors the first-party
 * session cookie), scrubs the address bar, and routes onward: a
 * saved return-to under /app/ wins (e.g. a shop owner who was
 * bounced out of Messages), else the dashboard — which renders the
 * BUSINESS dashboard for a shop/towing session. A missing or
 * malformed fragment means the flow didn't complete: back to
 * /business/login with the generic Google error flag.
 */
export default function BusinessGoogleCompletePage() {
  useEffect(() => {
    const fail = () => {
      window.location.href = "/business/login?error=google";
    };
    try {
      const fragment = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(fragment);
      const token = params.get("token");
      const businessRaw = params.get("business");
      if (!token || !businessRaw) {
        fail();
        return;
      }
      const business = JSON.parse(businessRaw) as {
        id?: unknown;
        type?: unknown;
        shopName?: unknown;
        companyName?: unknown;
        email?: unknown;
        phone?: unknown;
        plan?: unknown;
      };
      if (
        typeof business.id !== "string" ||
        typeof business.email !== "string" ||
        (business.type !== "shop" && business.type !== "towing")
      ) {
        fail();
        return;
      }
      saveSession(token, {
        id: business.id,
        name:
          typeof business.shopName === "string"
            ? business.shopName
            : typeof business.companyName === "string"
              ? business.companyName
              : "",
        email: business.email,
        phone: typeof business.phone === "string" ? business.phone : null,
        plan: typeof business.plan === "string" ? business.plan : "free",
        type: business.type,
      });
      // Scrub any payload from the address bar before navigating on.
      window.history.replaceState(null, "", window.location.pathname);
      let target = "/app";
      try {
        const returnTo = sessionStorage.getItem(RETURN_TO_KEY);
        sessionStorage.removeItem(RETURN_TO_KEY);
        if (returnTo && returnTo.startsWith("/app/")) target = returnTo;
      } catch {
        // Private mode — default destination.
      }
      window.location.href = target;
    } catch {
      fail();
    }
  }, []);

  return (
    <>
      <AppNav business logoHref="/" />
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <p className="text-base text-ink-2">Signing you in…</p>
      </main>
    </>
  );
}
