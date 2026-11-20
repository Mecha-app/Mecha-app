/**
 * Unread-badge tests (owner order 2026-11-20) — "you won't know if
 * you have a message unless you click on Messages."
 *
 * The Messages entries (driver nav, business nav, the business
 * dashboard's Messages action) show a count badge fed by
 * GET /api/messages/unread-count. These tests pin the number:
 *   - it sums UNREAD INCOMING messages across ALL of the reader's
 *     threads (a driver's own sends never count for the driver);
 *   - it agrees with the per-thread unread the thread list shows;
 *   - opening a thread drops the count by that thread's share;
 *   - zero is a real answer (the client hides the badge at zero);
 *   - towing accounts have no messaging surface — refused, not
 *     silently zero.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "test-secret-for-unread-badge";

import { MemoryAppStore } from "../lib/server/appStore";
import { registerBusiness } from "../lib/server/businessService";
import { ForbiddenError } from "../lib/server/errors";
import {
  countUnreadMessages,
  getThread,
  listThreads,
  postMessage,
} from "../lib/server/messageService";
import { MemoryIdentityStore } from "../lib/server/store";
import type { TokenPayload } from "../lib/server/jwt";

const DRIVER = {
  name: "Dana Driver",
  email: "dana@example.com",
  phone: null,
  phoneNormalized: null,
  passwordHash: null,
  googleSub: null,
  authMethod: "email" as const,
};

function shopBody(name: string, email: string) {
  return {
    shopName: name,
    email,
    password: "correct horse battery",
    phone: "617-555-0142",
    zip: "02101",
  };
}

async function seed() {
  const appStore = new MemoryAppStore();
  const users = new MemoryIdentityStore();
  const driver = await users.createUser({ ...DRIVER });
  const { business: shop1 } = await registerBusiness(
    appStore,
    "shop",
    shopBody("Fair Fix Auto", "one@fairfix.example"),
  );
  const { business: shop2 } = await registerBusiness(
    appStore,
    "shop",
    shopBody("Second Bay Auto", "two@secondbay.example"),
  );
  const driverPayload: TokenPayload = { id: driver.id, type: "driver", iat: 0, exp: 0 };
  const shop1Payload: TokenPayload = { id: shop1.id, type: "shop", iat: 0, exp: 0 };
  const shop2Payload: TokenPayload = { id: shop2.id, type: "shop", iat: 0, exp: 0 };
  return { appStore, users, driver, shop1, shop2, driverPayload, shop1Payload, shop2Payload };
}

test("unread math: incoming across all threads, own sends never count", async () => {
  const s = await seed();
  // Shop 1 → driver ×2, shop 2 → driver ×3, driver → shop 1 ×1.
  await postMessage(s.appStore, s.users, s.shop1Payload, { userId: s.driver.id, body: "Your car is on the lift." });
  await postMessage(s.appStore, s.users, s.shop1Payload, { userId: s.driver.id, body: "Found the issue — brakes." });
  await postMessage(s.appStore, s.users, s.shop2Payload, { userId: s.driver.id, body: "We can take it Thursday." });
  await postMessage(s.appStore, s.users, s.shop2Payload, { userId: s.driver.id, body: "Bring the title too." });
  await postMessage(s.appStore, s.users, s.shop2Payload, { userId: s.driver.id, body: "See you then." });
  await postMessage(s.appStore, s.users, s.driverPayload, { shopId: s.shop1.id, body: "Thanks — see you at 5." });

  assert.equal(await countUnreadMessages(s.appStore, s.driverPayload), 5);
  assert.equal(await countUnreadMessages(s.appStore, s.shop1Payload), 1);
  assert.equal(await countUnreadMessages(s.appStore, s.shop2Payload), 0);

  // The badge number agrees with the thread list's per-thread
  // unread — one truth, two surfaces.
  const threads = await listThreads(s.appStore, s.driverPayload);
  assert.equal(
    threads.reduce((sum, th) => sum + th.unread, 0),
    5,
  );
});

test("unread math: opening a thread drops the count by that thread's share", async () => {
  const s = await seed();
  await postMessage(s.appStore, s.users, s.shop1Payload, { userId: s.driver.id, body: "One." });
  await postMessage(s.appStore, s.users, s.shop1Payload, { userId: s.driver.id, body: "Two." });
  await postMessage(s.appStore, s.users, s.shop2Payload, { userId: s.driver.id, body: "Other shop." });
  await postMessage(s.appStore, s.users, s.driverPayload, { shopId: s.shop1.id, body: "Driver here." });

  assert.equal(await countUnreadMessages(s.appStore, s.driverPayload), 3);
  await getThread(s.appStore, s.driverPayload, { shopId: s.shop1.id });
  assert.equal(await countUnreadMessages(s.appStore, s.driverPayload), 1, "shop 2's message still waits");
  // The shop's own badge is untouched by the driver reading.
  assert.equal(await countUnreadMessages(s.appStore, s.shop1Payload), 1);
  await getThread(s.appStore, s.shop1Payload, { userId: s.driver.id });
  assert.equal(await countUnreadMessages(s.appStore, s.shop1Payload), 0, "zero is a real answer — badge hides");
});

test("unread count: towing has no messaging surface — refused honestly", async () => {
  const s = await seed();
  const towingPayload: TokenPayload = { id: "tow-1", type: "towing", iat: 0, exp: 0 };
  await assert.rejects(() => countUnreadMessages(s.appStore, towingPayload), ForbiddenError);
});

test("unread badge wiring: route gate, nav, badge component, dashboard", () => {
  const root = process.cwd();
  const route = readFileSync(join(root, "app/api/messages/unread-count/route.ts"), "utf8");
  assert.ok(route.includes('requireAuth(request, ["driver", "shop"])'), "route is driver+shop gated");
  assert.ok(route.includes("countUnreadMessages"), "route serves the service count");

  const badge = readFileSync(join(root, "components/UnreadBadge.tsx"), "utf8");
  assert.ok(badge.includes("/api/messages/unread-count"), "the hook reads the count endpoint");
  assert.ok(badge.includes("count <= 0"), "zero unread renders no badge");
  assert.ok(badge.includes("mecha:unread-refresh"), "the badge re-reads when Messages marks a thread read");

  const nav = readFileSync(join(root, "components/AppNav.tsx"), "utf8");
  assert.ok(nav.includes("useUnreadCount") && nav.includes("UnreadBadge"), "the shared nav carries the badge");
  assert.ok(nav.includes('link.href === "/app/messages"'), "the badge rides the Messages entry only");

  const dashboard = readFileSync(join(root, "app/app/page.tsx"), "utf8");
  assert.ok(dashboard.includes("UnreadBadge"), "the dashboard Messages action carries the same count");
});
