"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listThreads = listThreads;
exports.getThread = getThread;
exports.postMessage = postMessage;
const authService_1 = require("./authService");
const errors_1 = require("./errors");
/**
 * Driver ↔ shop messaging (WP6) — a simple threaded view over the
 * repo's flat shop_messages table: a thread is one (driver, shop)
 * pair, messages carry their sender, and each side reads ONLY its own
 * threads. Request-based by design (no websockets — the blueprint's
 * Phase-2 note stands). Towing accounts have no messaging surface in
 * the repo model and none is invented here.
 */
function cleanBody(value) {
    if (typeof value !== "string")
        throw new authService_1.ValidationError('A non-empty "body" is required.');
    const body = value.trim();
    if (body.length === 0 || body.length > 2000) {
        throw new authService_1.ValidationError('"body" must be between 1 and 2000 characters.');
    }
    return body;
}
async function listThreads(store, payload) {
    if (payload.type === "driver")
        return store.listThreadsForUser(payload.id);
    if (payload.type === "shop")
        return store.listThreadsForShop(payload.id);
    throw new errors_1.ForbiddenError("Messaging is between drivers and shops.");
}
async function getThread(store, payload, query) {
    if (payload.type === "driver") {
        const shopId = query.shopId ?? "";
        const shop = await store.findShopProfileById(shopId);
        if (!shop)
            throw new errors_1.NotFoundError("Shop not found.");
        const messages = await store.listThreadMessages(payload.id, shopId);
        await store.markThreadRead(payload.id, shopId, "user");
        return { messages, userId: payload.id, shopId };
    }
    if (payload.type === "shop") {
        const userId = query.userId ?? "";
        if (!userId)
            throw new authService_1.ValidationError('A "userId" is required to open a thread.');
        const messages = await store.listThreadMessages(userId, payload.id);
        if (messages.length === 0)
            throw new errors_1.NotFoundError("Conversation not found.");
        await store.markThreadRead(userId, payload.id, "shop");
        return { messages, userId, shopId: payload.id };
    }
    throw new errors_1.ForbiddenError("Messaging is between drivers and shops.");
}
async function postMessage(store, users, payload, body) {
    const text = cleanBody(body.body);
    if (payload.type === "driver") {
        const shopId = typeof body.shopId === "string" ? body.shopId : "";
        const shop = await store.findShopProfileById(shopId);
        if (!shop)
            throw new errors_1.NotFoundError("Shop not found.");
        return store.postMessage({ userId: payload.id, shopId, senderType: "user", body: text });
    }
    if (payload.type === "shop") {
        const userId = typeof body.userId === "string" ? body.userId : "";
        if (!userId)
            throw new authService_1.ValidationError('A "userId" is required to reply to a driver.');
        // A shop may only write inside a thread that already exists, or to
        // a real driver account — never into the void.
        const existing = await store.listThreadMessages(userId, payload.id);
        if (existing.length === 0) {
            const user = await users.findUserById(userId);
            if (!user)
                throw new errors_1.NotFoundError("Driver not found.");
        }
        return store.postMessage({ userId, shopId: payload.id, senderType: "shop", body: text });
    }
    throw new errors_1.ForbiddenError("Messaging is between drivers and shops.");
}
