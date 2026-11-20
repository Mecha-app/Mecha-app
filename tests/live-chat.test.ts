/**
 * Live-chat tests (owner order 2026-11-20) — inside the app's
 * Messages screen, like a real chat:
 *
 *   - LIVE ARRIVAL: the open thread polls and merges — a message
 *     the other side sends appears without a refresh, and the
 *     merge never duplicates or reorders (union by id, server
 *     copy wins, createdAt order with an id tiebreak).
 *   - TYPING INDICATOR: a heartbeat ping extends the caller's
 *     typing expiry by TYPING_TTL_MS; the other side's thread read
 *     reports counterpartTyping only inside that window — the
 *     caller's own typing never shows to themselves, and an
 *     expired ping is honestly "not typing".
 *   - The ping guards mirror posting's: no typing into the void.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "test-secret-for-live-chat";

import { MemoryAppStore } from "../lib/server/appStore";
import { ValidationError } from "../lib/server/authService";
import { registerBusiness } from "../lib/server/businessService";
import { NotFoundError } from "../lib/server/errors";
import {
  TYPING_TTL_MS,
  getThread,
  isCounterpartTyping,
  pingTyping,
  postMessage,
} from "../lib/server/messageService";
import { MemoryIdentityStore } from "../lib/server/store";
import type { TokenPayload } from "../lib/server/jwt";
import {
  THREAD_LIST_POLL_MS,
  THREAD_POLL_MS,
  TYPING_PING_MS,
  mergeThreadMessages,
} from "../lib/threadLive";

const DRIVER = {
  name: "Dana Driver",
  email: "dana@example.com",
  phone: null,
  phoneNormalized: null,
  passwordHash: null,
  googleSub: null,
  authMethod: "email" as const,
};
const SHOP = {
  shopName: "Fair Fix Auto",
  email: "owner@fairfix.example",
  password: "correct horse battery",
  phone: "617-555-0142",
  zip: "02101",
};

async function seed() {
  const appStore = new MemoryAppStore();
  const users = new MemoryIdentityStore();
  const driver = await users.createUser({ ...DRIVER });
  const { business } = await registerBusiness(appStore, "shop", { ...SHOP });
  const driverPayload: TokenPayload = { id: driver.id, type: "driver", iat: 0, exp: 0 };
  const shopPayload: TokenPayload = { id: business.id, type: "shop", iat: 0, exp: 0 };
  // A thread exists (the driver wrote first) so both sides can act.
  await postMessage(appStore, users, driverPayload, {
    shopId: business.id,
    body: "Hi — I left the Corolla at your shop this morning.",
  });
  return { appStore, users, driver, business, driverPayload, shopPayload };
}

/* ------------------------- Merge math --------------------------- */

const msg = (id: string, createdAt: string, body = id) => ({ id, createdAt, body });

test("merge: a poll that catches up adds the new message exactly once", () => {
  const open = [msg("m1", "2026-11-20T10:00:00.000Z"), msg("m2", "2026-11-20T10:01:00.000Z")];
  const polled = [...open, msg("m3", "2026-11-20T10:02:00.000Z")];
  const merged = mergeThreadMessages(open, polled);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["m1", "m2", "m3"],
  );
});

test("merge: my just-sent message survives a poll that hasn't caught up", () => {
  const open = [msg("m1", "2026-11-20T10:00:00.000Z"), msg("mine", "2026-11-20T10:03:00.000Z")];
  const stalePoll = [msg("m1", "2026-11-20T10:00:00.000Z")];
  const merged = mergeThreadMessages(open, stalePoll);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["m1", "mine"],
    "the union never drops a message the server hasn't echoed yet",
  );
});

test("merge: duplicated ids collapse and order is stable across polls", () => {
  const a = msg("m2", "2026-11-20T10:01:00.000Z");
  const b = msg("m1", "2026-11-20T10:01:00.000Z"); // same timestamp as m2
  const merged = mergeThreadMessages([a, b], [b, a, a]);
  assert.deepEqual(
    merged.map((m) => m.id),
    ["m1", "m2"],
    "createdAt order, id tiebreak — equal timestamps cannot shuffle",
  );
  const again = mergeThreadMessages(merged, [a, b]);
  assert.deepEqual(
    again.map((m) => m.id),
    ["m1", "m2"],
    "re-merging the same poll is a no-op",
  );
});

test("poll cadences: thread is seconds, list is slower, ping inside the TTL", () => {
  assert.ok(THREAD_POLL_MS >= 2000 && THREAD_POLL_MS <= 5000);
  assert.ok(THREAD_LIST_POLL_MS > THREAD_POLL_MS);
  assert.ok(TYPING_PING_MS < TYPING_TTL_MS, "the heartbeat must land before the last ping expires");
});

/* ------------------------- Typing state ------------------------- */

test("typing: a ping shows to the OTHER side inside the window, then expires", async () => {
  const s = await seed();
  const t0 = new Date("2026-11-20T15:00:00.000Z");
  const { expiresAt } = await pingTyping(s.appStore, s.users, s.shopPayload, {
    userId: s.driver.id,
  }, t0);
  assert.equal(expiresAt, new Date(t0.getTime() + TYPING_TTL_MS).toISOString());

  // The driver (other side) sees it mid-window…
  assert.equal(
    await isCounterpartTyping(s.appStore, s.driverPayload, s.driver.id, s.business.id, new Date(t0.getTime() + 3000)),
    true,
  );
  // …the shop does NOT see its own typing…
  assert.equal(
    await isCounterpartTyping(s.appStore, s.shopPayload, s.driver.id, s.business.id, new Date(t0.getTime() + 3000)),
    false,
  );
  // …and after the window it is honestly gone.
  assert.equal(
    await isCounterpartTyping(s.appStore, s.driverPayload, s.driver.id, s.business.id, new Date(t0.getTime() + TYPING_TTL_MS + 1)),
    false,
  );
});

test("typing: the thread read carries counterpartTyping both ways", async () => {
  const s = await seed();
  // Nobody typing: both reads say so.
  let thread = await getThread(s.appStore, s.driverPayload, { shopId: s.business.id });
  assert.equal(thread.counterpartTyping, false);
  // The shop starts typing → the driver's next poll shows it.
  await pingTyping(s.appStore, s.users, s.shopPayload, { userId: s.driver.id });
  thread = await getThread(s.appStore, s.driverPayload, { shopId: s.business.id });
  assert.equal(thread.counterpartTyping, true);
  // A stale ping (window already over) reads as not typing.
  await pingTyping(s.appStore, s.users, s.driverPayload, { shopId: s.business.id }, new Date(Date.now() - TYPING_TTL_MS - 1000));
  const shopThread = await getThread(s.appStore, s.shopPayload, { userId: s.driver.id });
  assert.equal(shopThread.counterpartTyping, false);
});

test("typing: store round-trip keeps the two sides separate", async () => {
  const store = new MemoryAppStore();
  await store.setThreadTyping("u1", "s1", "user", "2026-11-20T15:00:06.000Z");
  assert.deepEqual(await store.getThreadTyping("u1", "s1"), {
    user: "2026-11-20T15:00:06.000Z",
    shop: null,
  });
  await store.setThreadTyping("u1", "s1", "shop", "2026-11-20T15:00:07.000Z");
  assert.deepEqual(await store.getThreadTyping("u1", "s1"), {
    user: "2026-11-20T15:00:06.000Z",
    shop: "2026-11-20T15:00:07.000Z",
  });
  assert.deepEqual(await store.getThreadTyping("u1", "other-shop"), { user: null, shop: null });
});

test("typing: ping guards — no typing into the void", async () => {
  const s = await seed();
  await assert.rejects(
    () => pingTyping(s.appStore, s.users, s.driverPayload, { shopId: "no-such-shop" }),
    NotFoundError,
  );
  await assert.rejects(
    () => pingTyping(s.appStore, s.users, s.shopPayload, {}),
    ValidationError,
  );
  await assert.rejects(
    () => pingTyping(s.appStore, s.users, s.shopPayload, { userId: "ghost-driver" }),
    NotFoundError,
  );
});

/* ------------------------- Wiring contract ---------------------- */

test("live chat wiring: page polls + heartbeats, route + migration exist", () => {
  const root = process.cwd();
  const page = readFileSync(join(root, "app/app/messages/page.tsx"), "utf8");
  assert.ok(page.includes("THREAD_POLL_MS") && page.includes("mergeThreadMessages"), "open thread polls and merges");
  assert.ok(page.includes("THREAD_LIST_POLL_MS"), "thread list refreshes while the screen is open");
  assert.ok(page.includes("/api/messages/typing"), "composer heartbeats the typing endpoint");
  assert.ok(page.includes("counterpartTyping") && page.includes("m.typing"), "the indicator renders from the poll");
  assert.ok(page.includes("mecha:unread-refresh"), "reading a thread refreshes the nav badge");

  const typingRoute = readFileSync(join(root, "app/api/messages/typing/route.ts"), "utf8");
  assert.ok(typingRoute.includes('requireAuth(request, ["driver", "shop"])'));
  assert.ok(typingRoute.includes("pingTyping"));

  const migration = readFileSync(join(root, "db/migrations/0024_thread_typing.sql"), "utf8");
  assert.ok(migration.includes("CREATE TABLE IF NOT EXISTS thread_typing"));
  assert.ok(migration.includes("expires_at"), "the typing state is an expiring row, not a flag");
});
