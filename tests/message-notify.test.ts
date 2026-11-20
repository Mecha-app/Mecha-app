/**
 * Item 12 tests (2026-11-20) — NEW-MESSAGE EMAIL NOTIFICATIONS.
 *
 * In-app messaging existed (WP6) but postMessage told nobody: a shop
 * learned about a customer's message only by signing in and looking.
 * The owner's scenario — a customer leaves the car at the shop and
 * they coordinate through the app — needs the other side to KNOW.
 * These tests pin the notification contract:
 *
 *   - a driver → shop message emails the SHOP at its registered
 *     email (subject, sender name, preview, the /app/messages link);
 *   - a shop → driver reply emails the DRIVER at theirs;
 *   - the SENDER is never emailed about their own message;
 *   - a long body previews at ~100 chars with an ellipsis;
 *   - a broken mailer never fails the notification call (the post
 *     itself already succeeded — the route awaits this function).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "followup-test-secret";
process.env.CLIENT_URL = "https://mechatech.io";

import { MemoryAppStore } from "../lib/server/appStore";
import { registerBusiness } from "../lib/server/businessService";
import { RecordingMailer, type Mailer } from "../lib/server/mailer";
import {
  NEW_MESSAGE_SUBJECT,
  notifyNewMessage,
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
  const driverPayload: TokenPayload = {
    id: driver.id,
    type: "driver",
    iat: 0,
    exp: 0,
  };
  const shopPayload: TokenPayload = { id: business.id, type: "shop", iat: 0, exp: 0 };
  return { appStore, users, driver, business, driverPayload, shopPayload };
}

test("driver → shop: the SHOP is emailed — from the driver, with preview + link", async () => {
  const { appStore, users, business, driverPayload } = await seed();
  const mailer = new RecordingMailer();
  const message = await postMessage(appStore, users, driverPayload, {
    shopId: business.id,
    body: "Hi — I left the Corolla at your shop this morning. Any news on the brakes?",
  });
  await notifyNewMessage(appStore, users, mailer, driverPayload, message);

  assert.equal(mailer.messages.length, 1);
  const mail = mailer.messages[0];
  assert.equal(mail.to, SHOP.email);
  assert.equal(mail.subject, NEW_MESSAGE_SUBJECT);
  assert.equal(mail.subject, "You have a new message in MECHA");
  assert.ok(mail.text.includes("Dana Driver"), "names the sender");
  assert.ok(mail.text.includes("Any news on the brakes?"), "carries the preview");
  assert.ok(
    mail.text.includes("https://mechatech.io/app/messages"),
    "links straight to the messages screen",
  );
  // The sender is never the recipient of their own notification.
  assert.notEqual(mail.to, DRIVER.email);
});

test("shop → driver: the DRIVER is emailed — from the shop, in the same thread", async () => {
  const { appStore, users, business, driverPayload, shopPayload } = await seed();
  const mailer = new RecordingMailer();
  const first = await postMessage(appStore, users, driverPayload, {
    shopId: business.id,
    body: "Dropping the car off at noon.",
  });
  await notifyNewMessage(appStore, users, mailer, driverPayload, first);
  const reply = await postMessage(appStore, users, shopPayload, {
    userId: first.userId,
    body: "Got it — we'll have the estimate by 3.",
  });
  await notifyNewMessage(appStore, users, mailer, shopPayload, reply);

  assert.equal(mailer.messages.length, 2);
  const mail = mailer.messages[1];
  assert.equal(mail.to, DRIVER.email);
  assert.equal(mail.subject, NEW_MESSAGE_SUBJECT);
  assert.ok(mail.text.includes("Fair Fix Auto"), "names the shop as sender");
  assert.ok(mail.text.includes("estimate by 3"), "carries the reply preview");
  assert.ok(mail.text.includes("https://mechatech.io/app/messages"));
  assert.notEqual(mail.to, SHOP.email);
});

test("preview: a long body is cut at ~100 chars with an ellipsis", async () => {
  const { appStore, users, business, driverPayload } = await seed();
  const mailer = new RecordingMailer();
  const long = "x".repeat(240);
  const message = await postMessage(appStore, users, driverPayload, {
    shopId: business.id,
    body: long,
  });
  await notifyNewMessage(appStore, users, mailer, driverPayload, message);
  assert.equal(mailer.messages.length, 1);
  const text = mailer.messages[0].text;
  assert.ok(text.includes(`${"x".repeat(100)}…`), "preview is 100 chars + ellipsis");
  assert.ok(!text.includes("x".repeat(101)), "the full body never rides the email");
});

test("a broken mailer never fails the notification (the post already landed)", async () => {
  const { appStore, users, business, driverPayload } = await seed();
  const broken: Mailer = {
    name: "broken",
    isConfigured: () => true,
    send: async () => {
      throw new Error("smtp_down");
    },
  };
  const message = await postMessage(appStore, users, driverPayload, {
    shopId: business.id,
    body: "Still here — just checking in.",
  });
  // Must resolve, not reject.
  await notifyNewMessage(appStore, users, broken, driverPayload, message);
});
