"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authHeaders, getToken } from "@/lib/client/auth";

/**
 * The unread-messages badge (owner order 2026-11-20): a person
 * should SEE that messages are waiting — "you have one message,
 * two messages, three messages" — without opening Messages first.
 *
 * Request-based, like the messaging design itself: the count is
 * fetched on mount and again whenever the route changes (every
 * navigation remounts the nav, and the pathname dependency covers
 * shells that don't). No token (a signed-out surface rendering the
 * nav) or a failed read simply leaves the badge hidden — the count
 * is a courtesy, never a blocker. Zero unread renders nothing.
 */
export function useUnreadCount(): number {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  // The Messages screen dispatches this after it marks a thread
  // read, so the badge drops without waiting for a navigation.
  useEffect(() => {
    const onRefresh = () => setRefreshTick((n) => n + 1);
    window.addEventListener("mecha:unread-refresh", onRefresh);
    return () => window.removeEventListener("mecha:unread-refresh", onRefresh);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/messages/unread-count", {
          headers: { ...authHeaders() },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { unread?: unknown };
        if (!cancelled && typeof data.unread === "number" && data.unread > 0) {
          setUnread(Math.floor(data.unread));
        } else if (!cancelled) {
          setUnread(0);
        }
      } catch {
        // Offline or signed out mid-flight — the badge just stays off.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, refreshTick]);

  return unread;
}

/** The number pill itself. Renders nothing at zero. */
export function UnreadBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="ms-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-ink"
    >
      {count}
    </span>
  );
}
