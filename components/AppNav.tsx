"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GaugeMMark } from "./Logo";

/**
 * App chrome for the signed-in surfaces (WP6): the Gauge M, the four
 * working destinations, and sign-out. Sparse on purpose — the app is
 * used one-handed, often roadside, so the bar carries navigation and
 * nothing else. Every target is ≥48px.
 */
export function AppNav({ business = false }: { business?: boolean }) {
  const { t } = useLocale();
  const router = useRouter();

  function signOut() {
    clearSession();
    router.push("/login");
  }

  const links = business
    ? [
        { href: "/app", label: t.wp6.nav.dashboard },
        { href: "/app/messages", label: t.wp6.nav.messages },
        { href: "/app/nearby", label: t.wp6.nav.nearby },
      ]
    : [
        { href: "/app", label: t.wp6.nav.dashboard },
        { href: "/app/diagnose", label: t.wp6.nav.diagnose },
        { href: "/app/scan", label: t.wp6.nav.scan },
        { href: "/app/vault", label: t.wp6.nav.vault },
        { href: "/app/nearby", label: t.wp6.nav.nearby },
        { href: "/app/messages", label: t.wp6.nav.messages },
        { href: "/marketplace", label: t.wp6.nav.marketplace },
      ];

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
        <Link href="/app" className="flex h-12 items-center gap-2 pr-2" aria-label="MECHA">
          <GaugeMMark size={28} className="text-ink-1" />
          <span className="font-display text-lg font-bold tracking-[0.04em] text-ink-1">MECHA</span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center" aria-label="App">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex h-12 items-center px-3 text-base font-medium text-ink-2 hover:text-ink-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="flex h-12 items-center px-3 text-base font-medium text-ink-2 hover:text-ink-1"
        >
          {t.wp6.nav.signOut}
        </button>
      </div>
    </header>
  );
}
