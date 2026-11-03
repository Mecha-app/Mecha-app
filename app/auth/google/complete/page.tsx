"use client";

import { useEffect } from "react";
import { saveSession, type StoredUser } from "@/lib/client/auth";
import { RETURN_TO_KEY } from "@/lib/server/scan";

/**
 * /auth/google/complete — the landing for the Google callback's
 * success redirect. The callback delivers the standard auth payload
 * (token + public user) in the URL FRAGMENT: fragments are never sent
 * to a server and never appear in logs or Referer headers. This page
 * reads it, stores the session exactly like the password sign-in
 * does (saveSession), scrubs the fragment from the address bar, and
 * routes onward:
 *   - a phone-less account (every brand-new Google account) goes to
 *     /app/complete-profile — the identity is email AND phone, and
 *     diagnoses stay locked until the number is on file;
 *   - otherwise the saved return-to wins (the scan flow's contract),
 *     else the diagnosis screen — the login page's destinations.
 * A missing or malformed fragment means the flow didn't complete:
 * back to /login with the generic Google error flag.
 */
export default function GoogleCompletePage() {
  useEffect(() => {
    const fail = () => {
      window.location.href = "/login?error=google";
    };
    try {
      const fragment = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(fragment);
      const token = params.get("token");
      const userRaw = params.get("user");
      if (!token || !userRaw) {
        fail();
        return;
      }
      const user = JSON.parse(userRaw) as StoredUser;
      if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
        fail();
        return;
      }
      saveSession(token, user);
      // Scrub the payload from the address bar before navigating on.
      window.history.replaceState(null, "", window.location.pathname);
      if (!user.phone) {
        window.location.href = "/app/complete-profile";
        return;
      }
      let target = "/app/diagnose";
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
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <p className="text-center text-base text-ink-2" role="status">
        Signing you in…
      </p>
    </main>
  );
}
