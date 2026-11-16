import { ValidationError } from "./authService";
import { ForbiddenError, NotFoundError } from "./errors";
import type { TokenPayload } from "./jwt";
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

export async function getThread(
  store: AppStore,
  payload: TokenPayload,
  query: { shopId?: string | null; userId?: string | null },
): Promise<{ messages: MessageRecord[]; userId: string; shopId: string }> {
  if (payload.type === "driver") {
    const shopId = query.shopId ?? "";
    const shop = await store.findShopProfileById(shopId);
    if (!shop) throw new NotFoundError("Shop not found.");
    const messages = await store.listThreadMessages(payload.id, shopId);
    await store.markThreadRead(payload.id, shopId, "user");
    return { messages, userId: payload.id, shopId };
  }
  if (payload.type === "shop") {
    const userId = query.userId ?? "";
    if (!userId) throw new ValidationError('A "userId" is required to open a thread.');
    const messages = await store.listThreadMessages(userId, payload.id);
    if (messages.length === 0) throw new NotFoundError("Conversation not found.");
    await store.markThreadRead(userId, payload.id, "shop");
    return { messages, userId, shopId: payload.id };
  }
  throw new ForbiddenError("Messaging is between drivers and shops.");
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
