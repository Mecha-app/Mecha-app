import { ValidationError } from "./authService";
import { ForbiddenError, NotFoundError } from "./errors";
import type { TokenPayload } from "./jwt";
import type { Mailer } from "./mailer";
import type { AppStore, MessageRecord, ThreadSummary } from "./appStore";
import type { IdentityStore } from "./store";

/**
 * Driver ↔ shop messaging (WP6) — a simple threaded view over the
 * repo's flat shop_messages table: a thread is one (driver, shop)
 * pair, messages carry their sender, and each side reads ONLY its own
 * threads. Request-based by design (no websockets — the blueprint's
 * Phase-2 note stands). Towing accounts have no messaging surface in
 * the repo model and none is invented here.
 */

function cleanBody(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError('A non-empty "body" is required.');
  const body = value.trim();
  if (body.length === 0 || body.length > 2000) {
    throw new ValidationError('"body" must be between 1 and 2000 characters.');
  }
  return body;
}

export async function listThreads(
  store: AppStore,
  payload: TokenPayload,
): Promise<ThreadSummary[]> {
  if (payload.type === "driver") return store.listThreadsForUser(payload.id);
  if (payload.type === "shop") return store.listThreadsForShop(payload.id);
  throw new ForbiddenError("Messaging is between drivers and shops.");
}

/**
 * The nav unread badge's number (owner order 2026-11-20): how many
 * incoming messages are waiting, summed across every thread — so a
 * person can SEE "you have messages" without opening Messages.
 * Request-based like the rest of messaging: the nav asks on each
 * page load; nothing is pushed.
 */
export async function countUnreadMessages(
  store: AppStore,
  payload: TokenPayload,
): Promise<number> {
  if (payload.type === "driver") return store.countUnreadMessagesForUser(payload.id);
  if (payload.type === "shop") return store.countUnreadMessagesForShop(payload.id);
  throw new ForbiddenError("Messaging is between drivers and shops.");
}

export async function getThread(
  store: AppStore,
  payload: TokenPayload,
  query: { shopId?: string | null; userId?: string | null },
): Promise<{
  messages: MessageRecord[];
  userId: string;
  shopId: string;
  counterpartTyping: boolean;
}> {
  if (payload.type === "driver") {
    const shopId = query.shopId ?? "";
    const shop = await store.findShopProfileById(shopId);
    if (!shop) throw new NotFoundError("Shop not found.");
    const messages = await store.listThreadMessages(payload.id, shopId);
    await store.markThreadRead(payload.id, shopId, "user");
    const counterpartTyping = await isCounterpartTyping(store, payload, payload.id, shopId);
    return { messages, userId: payload.id, shopId, counterpartTyping };
  }
  if (payload.type === "shop") {
    const userId = query.userId ?? "";
    if (!userId) throw new ValidationError('A "userId" is required to open a thread.');
    const messages = await store.listThreadMessages(userId, payload.id);
    if (messages.length === 0) throw new NotFoundError("Conversation not found.");
    await store.markThreadRead(userId, payload.id, "shop");
    const counterpartTyping = await isCounterpartTyping(store, payload, userId, payload.id);
    return { messages, userId, shopId: payload.id, counterpartTyping };
  }
  throw new ForbiddenError("Messaging is between drivers and shops.");
}

// ---------------------------------------------------------------------------
// Typing heartbeat (live chat, owner order 2026-11-20): while the
// composer holds unsent text, the client pings every few seconds;
// each ping extends the caller's expiry by TYPING_TTL_MS. The other
// side's thread poll reads the expiry — in the future = typing.
// Deliberately as loose as the rest of messaging: no socket, no
// presence service, just one expiring row per side (migration
// 0024). The clock is a parameter so tests can walk time.
// ---------------------------------------------------------------------------

export const TYPING_TTL_MS = 6000;

export async function pingTyping(
  store: AppStore,
  users: IdentityStore,
  payload: TokenPayload,
  body: Record<string, unknown>,
  now: Date = new Date(),
): Promise<{ expiresAt: string }> {
  const expiresAt = new Date(now.getTime() + TYPING_TTL_MS).toISOString();
  if (payload.type === "driver") {
    const shopId = typeof body.shopId === "string" ? body.shopId : "";
    const shop = await store.findShopProfileById(shopId);
    if (!shop) throw new NotFoundError("Shop not found.");
    await store.setThreadTyping(payload.id, shopId, "user", expiresAt);
    return { expiresAt };
  }
  if (payload.type === "shop") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) throw new ValidationError('A "userId" is required to show typing.');
    // Same guard as posting: an existing thread, or a real driver.
    const existing = await store.listThreadMessages(userId, payload.id);
    if (existing.length === 0) {
      const user = await users.findUserById(userId);
      if (!user) throw new NotFoundError("Driver not found.");
    }
    await store.setThreadTyping(userId, payload.id, "shop", expiresAt);
    return { expiresAt };
  }
  throw new ForbiddenError("Messaging is between drivers and shops.");
}

/** Is the OTHER side of this thread inside its typing window? */
export async function isCounterpartTyping(
  store: AppStore,
  payload: TokenPayload,
  userId: string,
  shopId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const typing = await store.getThreadTyping(userId, shopId);
  const other = payload.type === "driver" ? typing.shop : typing.user;
  if (!other) return false;
  const expiry = Date.parse(other);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

export async function postMessage(
  store: AppStore,
  users: IdentityStore,
  payload: TokenPayload,
  body: Record<string, unknown>,
): Promise<MessageRecord> {
  const text = cleanBody(body.body);
  if (payload.type === "driver") {
    const shopId = typeof body.shopId === "string" ? body.shopId : "";
    const shop = await store.findShopProfileById(shopId);
    if (!shop) throw new NotFoundError("Shop not found.");
    return store.postMessage({ userId: payload.id, shopId, senderType: "user", body: text });
  }
  if (payload.type === "shop") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) throw new ValidationError('A "userId" is required to reply to a driver.');
    // A shop may only write inside a thread that already exists, or to
    // a real driver account — never into the void.
    const existing = await store.listThreadMessages(userId, payload.id);
    if (existing.length === 0) {
      const user = await users.findUserById(userId);
      if (!user) throw new NotFoundError("Driver not found.");
    }
    return store.postMessage({ userId, shopId: payload.id, senderType: "shop", body: text });
  }
  throw new ForbiddenError("Messaging is between drivers and shops.");
}

// ---------------------------------------------------------------------------
// New-message email notification (item 12, owner order 2026-11-20):
// messaging is request-based by design, so until now a shop only
// learned about a message by signing in and looking — the owner's
// scenario (a customer leaves the car at the shop; they coordinate
// through the app) needs the other side to KNOW. When a message is
// posted, the OTHER side gets one plain email at its registered
// address via the existing mailer: who it's from, a short preview,
// and the link to open MECHA and reply. The sender is never emailed.
// A notification failure NEVER fails the post — the message is
// already stored; this function swallows every error.
// ---------------------------------------------------------------------------

export const NEW_MESSAGE_SUBJECT = "You have a new message in MECHA";
const PREVIEW_CHARS = 100;

function messagesUrl(): string {
  const base = (process.env.CLIENT_URL ?? "https://mechatech.io").replace(/\/+$/, "");
  return `${base}/app/messages`;
}

export async function notifyNewMessage(
  store: AppStore,
  users: IdentityStore,
  mailer: Mailer,
  sender: TokenPayload,
  message: MessageRecord,
): Promise<void> {
  try {
    let to: string | null = null;
    let senderName: string;
    if (sender.type === "driver") {
      const shop = await store.findShopProfileById(message.shopId);
      if (!shop) return;
      const driver = await users.findUserById(message.userId);
      senderName = driver?.name ?? "A MECHA driver";
      to = shop.email;
    } else if (sender.type === "shop") {
      const user = await users.findUserById(message.userId);
      if (!user) return;
      const shop = await store.findShopProfileById(message.shopId);
      senderName = shop?.shopName ?? "A shop on MECHA";
      to = user.email;
    } else {
      return;
    }
    if (!to) return;
    const preview =
      message.body.length > PREVIEW_CHARS
        ? `${message.body.slice(0, PREVIEW_CHARS)}…`
        : message.body;
    await mailer.send({
      to,
      subject: NEW_MESSAGE_SUBJECT,
      text:
        `${senderName} sent you a new message in MECHA:\n\n` +
        `"${preview}"\n\n` +
        `Open MECHA to reply: ${messagesUrl()}\n`,
    });
  } catch {
    // The message itself is stored and delivered in-app; an email
    // hiccup must never surface as a failed post.
  }
}
