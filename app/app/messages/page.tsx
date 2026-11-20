"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getStoredUser, getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { RETURN_TO_KEY } from "@/lib/server/scan";
import {
  mergeThreadMessages,
  THREAD_LIST_POLL_MS,
  THREAD_POLL_MS,
  TYPING_PING_MS,
} from "@/lib/threadLive";

/**
 * /app/messages — driver ↔ shop conversations (WP6). The thread is
 * the (driver, shop) pair; opening one marks the other side read.
 * A driver arriving from a nearby-shop card (?shopId=…) lands
 * straight in that thread, even before the first message exists.
 * Shops see their customer threads with the same screen.
 *
 * LIVE (owner order 2026-11-20): the screen polls — the open
 * thread re-reads every few seconds so the other side's messages
 * appear on their own (merged by id, never duplicated or
 * reordered), the thread list refreshes on a slower beat, and the
 * composer heartbeats a typing signal while it holds unsent text
 * so the other side sees a "typing…" indicator. No socket — the
 * codebase's request-based design, tightened to seconds.
 */

interface Thread {
  userId: string;
  shopId: string;
  counterpartName: string;
  lastBody: string;
  lastAt: string;
  unread: number;
}

interface Message {
  id: string;
  senderType: "user" | "shop";
  body: string;
  createdAt: string;
}

/** Tell the nav badge to re-read its count (it lives outside this
 * page's tree state; the hook listens for this event). */
function refreshBadge() {
  try {
    window.dispatchEvent(new Event("mecha:unread-refresh"));
  } catch {
    // No window (never in this client page) — the badge also
    // refreshes on every navigation regardless.
  }
}

export default function MessagesPage() {
  const { t } = useLocale();
  const m = t.wp6.messages;
  const [isShop, setIsShop] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<{ userId: string; shopId: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  // Refs mirror the open thread so the poll intervals always read
  // the CURRENT conversation, never a stale closure.
  const openRef = useRef(open);
  openRef.current = open;
  const isShopRef = useRef(isShop);
  isShopRef.current = isShop;

  const loadThreads = useCallback(async () => {
    const res = await apiFetch<{ threads: Thread[] }>("/api/messages");
    if (res.status === 200) setThreads(res.data.threads);
  }, []);

  const threadQuery = useCallback((userId: string, shopId: string, shop: boolean) => {
    return shop
      ? `userId=${encodeURIComponent(userId)}`
      : `shopId=${encodeURIComponent(shopId)}`;
  }, []);

  const openThread = useCallback(
    async (userId: string, shopId: string, name: string) => {
      setOpen({ userId, shopId, name });
      setCounterpartTyping(false);
      const res = await apiFetch<{ messages: Message[]; counterpartTyping?: boolean }>(
        `/api/messages/thread?${threadQuery(userId, shopId, isShop)}`,
      );
      if (res.status === 200) {
        setMessages(res.data.messages);
        setCounterpartTyping(Boolean(res.data.counterpartTyping));
      } else setMessages([]);
      // Opening marked the thread read server-side — the badge
      // count just dropped; have the nav re-read it now.
      refreshBadge();
    },
    [isShop, threadQuery],
  );

  // Live thread poll: while a conversation is open, re-read it on
  // the THREAD_POLL_MS beat and merge by id — the other side's new
  // messages appear without a refresh, and nothing duplicates or
  // reorders. Paused while the tab is hidden.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const current = openRef.current;
      if (!current) return;
      void (async () => {
        const res = await apiFetch<{ messages: Message[]; counterpartTyping?: boolean }>(
          `/api/messages/thread?${threadQuery(current.userId, current.shopId, isShopRef.current)}`,
        );
        if (res.status !== 200) return;
        if (!openRef.current) return;
        setMessages((prev) => mergeThreadMessages(prev, res.data.messages));
        setCounterpartTyping(Boolean(res.data.counterpartTyping));
      })();
    }, THREAD_POLL_MS);
    return () => window.clearInterval(id);
  }, [open, threadQuery]);

  // Live thread list: unread counts and last-message previews stay
  // fresh while the screen is open (pairs with the nav badge).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void loadThreads();
    }, THREAD_LIST_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadThreads]);

  // Typing heartbeat: while the composer holds unsent text in an
  // open thread, ping on the TYPING_PING_MS beat (each ping buys a
  // few seconds of "typing" on the other side). Clearing the
  // composer or sending stops the pings; the last ping expires on
  // its own.
  const hasDraft = draft.trim().length > 0;
  useEffect(() => {
    if (!open || !hasDraft) return;
    const ping = () => {
      const current = openRef.current;
      if (!current) return;
      void apiFetch("/api/messages/typing", {
        method: "POST",
        body: JSON.stringify(
          isShopRef.current ? { userId: current.userId } : { shopId: current.shopId },
        ),
      });
    };
    ping();
    const id = window.setInterval(ping, TYPING_PING_MS);
    return () => window.clearInterval(id);
  }, [open, hasDraft]);

  useEffect(() => {
    if (!getToken()) {
      // Carry the destination (item 10, 2026-11-20): a visitor who
      // tapped "Messages" on a shop's profile — or a shop owner
      // checking replies — lands BACK here after sign-in, thread
      // included, instead of being stranded on a dashboard. Every
      // sign-in door honors the saved return-to (driver login,
      // business login, both Google completion pages).
      try {
        sessionStorage.setItem(
          RETURN_TO_KEY,
          window.location.pathname + window.location.search,
        );
      } catch {
        // Private mode — the bounce still works, just without the return.
      }
      window.location.href = "/login";
      return;
    }
    const stored = getStoredUser();
    const shop = stored?.type === "shop";
    setIsShop(shop);
    void (async () => {
      await loadThreads();
      const shopId = new URLSearchParams(window.location.search).get("shopId");
      if (shopId && !shop && stored) {
        await openThread(stored.id, shopId, "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!open || draft.trim().length === 0) return;
    setError("");
    const res = await apiFetch<{ message: Message }>("/api/messages", {
      method: "POST",
      body: JSON.stringify(
        isShop
          ? { userId: open.userId, body: draft.trim() }
          : { shopId: open.shopId, body: draft.trim() },
      ),
    });
    if (res.status === 201) {
      setMessages((prev) => [...prev, res.data.message]);
      setDraft("");
      void loadThreads();
    } else {
      setError(apiDetail(res.data, t.wp6.common.somethingWrong));
    }
  }

  return (
    <>
      <AppNav business={isShop} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.01em] text-ink-1">
          {m.title}
        </h1>

        {!open && (
          <>
            {threads.length === 0 ? (
              <p className="mt-4 text-base leading-relaxed text-ink-2">{m.noThreads}</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-2">
                {threads.map((thread) => (
                  <li key={`${thread.userId}|${thread.shopId}`}>
                    <button
                      type="button"
                      onClick={() =>
                        void openThread(thread.userId, thread.shopId, thread.counterpartName)
                      }
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-start"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-lg font-semibold text-ink-1">
                          {thread.counterpartName}
                        </span>
                        <span className="text-sm text-ink-3">
                          {new Date(thread.lastAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-base text-ink-2">
                        {thread.lastBody}
                      </span>
                      {thread.unread > 0 && (
                        <span className="mt-1 block text-sm font-medium text-accent">
                          {thread.unread} {m.unread}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {open && (
          <section className="mt-5">
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                void loadThreads();
              }}
              className="flex h-12 items-center text-base font-medium text-ink-2"
            >
              ← {t.wp6.common.back}
            </button>
            {open.name && (
              <h2 className="font-display text-2xl font-semibold text-ink-1">{open.name}</h2>
            )}
            <ul className="mt-4 flex flex-col gap-2">
              {messages.map((msg) => {
                const mine = isShop ? msg.senderType === "shop" : msg.senderType === "user";
                return (
                  <li
                    key={msg.id}
                    className={
                      "max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed " +
                      (mine
                        ? "self-end bg-accent text-accent-ink"
                        : "self-start border border-line bg-surface text-ink-1")
                    }
                    style={{ alignSelf: mine ? "flex-end" : "flex-start" }}
                  >
                    {msg.body}
                    <span
                      className={
                        "mt-1 block text-xs " + (mine ? "text-accent-ink opacity-70" : "text-ink-3")
                      }
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
            {counterpartTyping && (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-3" role="status">
                <span className="flex items-center gap-1" aria-hidden="true">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ink-3" />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-ink-3"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-ink-3"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
                {m.typing}
              </p>
            )}
            <form onSubmit={onSend} className="mt-5 flex gap-2" noValidate>
              <input
                className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink-1 placeholder:text-ink-3"
                placeholder={m.placeholder}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={m.placeholder}
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-full bg-accent px-6 text-base font-semibold text-accent-ink"
              >
                {m.send}
              </button>
            </form>
            {error && (
              <p className="mt-3 text-base text-verdict-rip" role="alert">
                {error}
              </p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
