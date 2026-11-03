"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * Social sign-in block (social login package) — the big-brand options
 * pattern on /login and /register: "Continue with Google" above the
 * email form, separated by an "or" divider, so the customer picks a
 * door instead of being forced through one.
 *
 * The button renders ONLY when the server reports Google sign-in
 * configured (GET /api/auth/providers — booleans only, no secrets):
 * in an unwired environment the block is simply absent and the plain
 * form stands alone. No dead Apple button ships — Apple sign-in is
 * staged behind the owner's Apple Developer account.
 */

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function SocialSignIn() {
  const { t } = useLocale();
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/providers");
        const data = (await res.json()) as { google?: boolean };
        if (!cancelled && data.google === true) setGoogleEnabled(true);
      } catch {
        // Providers unknown — the email form stands alone.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!googleEnabled) return null;

  return (
    <div className="mt-8">
      <a
        href="/api/auth/google/start"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-6 text-base font-semibold text-[#3c4043]"
      >
        <GoogleMark />
        {t.auth.social.continueWithGoogle}
      </a>
      <div className="mt-6 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-sm font-medium text-ink-3">{t.auth.social.or}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
