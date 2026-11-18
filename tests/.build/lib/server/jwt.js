"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthNotConfiguredError = void 0;
exports.isAuthConfigured = isAuthConfigured;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.bearerPayload = bearerPayload;
const node_crypto_1 = require("node:crypto");
const sessionCookie_1 = require("./sessionCookie");
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
class AuthNotConfiguredError extends Error {
    code = "auth_not_configured";
    constructor() {
        super("JWT_SECRET is not set — auth is not wired in this environment.");
        this.name = "AuthNotConfiguredError";
    }
}
exports.AuthNotConfiguredError = AuthNotConfiguredError;
function isAuthConfigured() {
    return typeof process.env.JWT_SECRET === "string" && process.env.JWT_SECRET.length > 0;
}
function secret() {
    const s = process.env.JWT_SECRET;
    if (!s || s.length === 0)
        throw new AuthNotConfiguredError();
    return s;
}
function base64UrlEncode(buf) {
    return buf.toString("base64").split("+").join("-").split("/").join("_").split("=")[0];
}
function base64UrlDecode(s) {
    const b64 = s.split("-").join("+").split("_").join("/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return Buffer.from(padded, "base64");
}
function sign(data, key) {
    return base64UrlEncode((0, node_crypto_1.createHmac)("sha256", key).update(data).digest());
}
function signToken(input, expiresInSeconds = THIRTY_DAYS_SECONDS) {
    const now = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8"));
    const payload = base64UrlEncode(Buffer.from(JSON.stringify({ id: input.id, type: input.type, iat: now, exp: now + expiresInSeconds }), "utf8"));
    const body = `${header}.${payload}`;
    return `${body}.${sign(body, secret())}`;
}
function verifyToken(token) {
    if (!isAuthConfigured())
        throw new AuthNotConfiguredError();
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;
    const [header, payload, signature] = parts;
    const expected = sign(`${header}.${payload}`, secret());
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !(0, node_crypto_1.timingSafeEqual)(a, b))
        return null;
    let parsed;
    try {
        parsed = JSON.parse(base64UrlDecode(payload).toString("utf8"));
    }
    catch {
        return null;
    }
    if (typeof parsed.id !== "string" || typeof parsed.exp !== "number")
        return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000))
        return null;
    if (parsed.type !== "driver" && parsed.type !== "shop" && parsed.type !== "towing")
        return null;
    return parsed;
}
/**
 * Extract + verify the session token from a request; null when
 * absent/invalid. The Bearer header wins; the first-party session
 * cookie (lib/server/sessionCookie.ts, the 2026-11-16 persistence
 * fix) is the fallback, so a request whose browser carries only
 * the cookie — localStorage lost in a webview, the token never
 * re-sent by hand — still authenticates. SameSite=Lax on the
 * cookie keeps cross-site POSTs from carrying it.
 */
function bearerPayload(request) {
    const header = request.headers.get("authorization");
    if (header) {
        const [scheme, token] = header.split(" ");
        if (scheme === "Bearer" && token)
            return verifyToken(token);
    }
    const cookieToken = (0, sessionCookie_1.sessionTokenFromCookieHeader)(request.headers.get("cookie"));
    return cookieToken ? verifyToken(cookieToken) : null;
}
