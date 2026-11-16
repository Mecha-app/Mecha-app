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
 * the saved return-to wins (the scan flow's contract), else the
 * dashboard — for EVERY account, phone on file or not.
 *
 * The phone wall that used to stand here is GONE (owner, 2026-11-16:
 * he signed in with Google on his phone and hit /app/complete-profile
 * instead of his account — "once you sign in you should be able to
 * see inside of your account and see like the options"). A phone-less
 * account (every brand-new Google account) now lands in the dashboard
 * like everyone else; the number is collected by the dashboard's
 * non-blocking, dismissible phone card, in place. The diagnosis gate
 * itself is unchanged: diagnoses still require the number (the
 * identity is email AND phone), and the free count still keys on
 * the account — only the sign-in path stopped being a wall.
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
      // No phone branch: sign-in lands in the dashboard for every
      // account (owner, 2026-11-16) — the dashboard's phone card
      // collects the number in place when it's missing.
      let target = "/app";
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
