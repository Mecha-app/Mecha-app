"use client";

import { useEffect } from "react";
import { saveSession, type StoredUser } from "@/lib/client/auth";
import { MinimalTopBar } from "@/components/MinimalTopBar";
import { RETURN_TO_KEY } from "@/lib/server/scan";

/**
 * /auth/google/complete — the landing for a successful Google
 * sign-in, BOTH doors:
 *   - legacy: the callback delivers the standard auth payload
 *     (token + public user) in the URL FRAGMENT — fragments are
 *     never sent to a server and never appear in logs or Referer
 *     headers;
 *   - Better Auth (2026-11-06): the callback sets a cookie session
 *     and lands here bare; the page exchanges that session for the
 *     standard payload at GET /api/auth/session-bridge.
 * Either way it stores the session exactly like the password sign-in
 * does (saveSession), scrubs the address bar, and routes onward:
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
    const finish = (token: string, user: StoredUser) => {
      // Scrub any payload from the address bar before navigating on.
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
    };
    const run = async () => {
      try {
        const fragment = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(fragment);
        const token = params.get("token");
        const userRaw = params.get("user");
        if (token && userRaw) {
          // Legacy door: the callback delivered the payload in the
          // URL fragment (never sent to a server, never logged).
          const user = JSON.parse(userRaw) as StoredUser;
          if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
            fail();
            return;
          }
          finish(token, user);
          return;
        }
        // Better Auth door: no fragment — the callback set a cookie
        // session; exchange it for the standard payload at the
        // session bridge, then route exactly like the legacy door.
        const res = await fetch("/api/auth/session-bridge");
        if (!res.ok) {
          fail();
          return;
        }
        const data = (await res.json()) as { token?: string; user?: StoredUser };
        if (
          !data.token ||
          !data.user ||
          typeof data.user.id !== "string" ||
          typeof data.user.email !== "string"
        ) {
          fail();
          return;
        }
        finish(data.token, data.user);
      } catch {
        fail();
      }
    };
    void run();
  }, []);

  return (
    <>
      <MinimalTopBar />
      <main className="mx-auto w-full max-w-md px-4 py-16">
        <p className="text-center text-base text-ink-2" role="status">
          Signing you in…
        </p>
      </main>
    </>
  );
}
