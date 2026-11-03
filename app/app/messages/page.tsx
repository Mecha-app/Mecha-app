"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppNav } from "@/components/AppNav";
import { apiDetail, apiFetch } from "@/lib/client/api";
import { getStoredUser, getToken } from "@/lib/client/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/**
 * /app/messages — driver ↔ shop conversations (WP6). The thread is
 * the (driver, shop) pair; opening one marks the other side read.
 * A driver arriving from a nearby-shop card (?shopId=…) lands
 * straight in that thread, even before the first message exists.
 * Shops see their customer threads with the same screen.
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

export default function MessagesPage() {
  const { t } = useLocale();
  const m = t.wp6.messages;
  const [isShop, setIsShop] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<{ userId: string; shopId: string; name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const loadThreads = useCallback(async () => {
    const res = await apiFetch<{ threads: Thread[] }>("/api/messages");
    if (res.status === 200) setThreads(res.data.threads);
  }, []);

  const openThread = useCallback(
    async (userId: string, shopId: string, name: string) => {
      setOpen({ userId, shopId, name });
      const qs = isShop
        ? `userId=${encodeURIComponent(userId)}`
        : `shopId=${encodeURIComponent(shopId)}`;
      const res = await apiFetch<{ messages: Message[] }>(`/api/messages/thread?${qs}`);
      if (res.status === 200) setMessages(res.data.messages);
      else setMessages([]);
    },
    [isShop],
  );

  useEffect(() => {
    if (!getToken()) {
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
                        "mt-1 block text-xs " + (mine ? "text-accent-ink/70" : "text-ink-3")
                      }
                    >
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
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
