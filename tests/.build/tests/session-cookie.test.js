"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Session persistence contract — the owner's fix (2026-11-16,
 * folded into design pass #8). His words, on his phone: "Sign up
 * and sign in, they don't work. The button is there, it says you
 * sign up but you never get inside the account." And on Google
 * specifically: the app emailed "you logged in" and then told him
 * to sign in again — a loop.
 *
 * THE BUG: the session lived ONLY in localStorage. On mobile
 * Safari / in-app webviews that storage did not survive the
 * sign-in round-trips, so every door "succeeded" and the /app
 * guard found no token and bounced straight back to /login.
 *
 * THE FIX, pinned here:
 *   (a) the session JWT is carried by a first-party cookie
 *       `mecha_session` (Path=/, Secure, SameSite=Lax, 30-day
 *       Max-Age — never SameSite=None, never third-party), set by
 *       the server on every auth completion response, and for
 *       Google on a top-level navigation redirect response;
 *   (b) the guards accept that cookie: the client guard reads it
 *       first (localStorage second), and the server gates fall
 *       back to it when no Bearer header is present;
 *   (c) the Google completion page establishes the session
 *       through a top-level navigation, never a fetch + localStorage.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "session-cookie-test-secret";
const authService_1 = require("../lib/server/authService");
const jwt_1 = require("../lib/server/jwt");
const routeAuth_1 = require("../lib/server/routeAuth");
const sessionCookie_1 = require("../lib/server/sessionCookie");
const store_1 = require("../lib/server/store");
const root = process.cwd();
const read = (rel) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, rel), "utf8");
const DRIVER = {
    name: "Session Tester",
    email: "session@example.com",
    phone: "(617) 555-0118",
    password: "correct horse battery",
};
function cookieReq(token) {
    return new Request("http://test.invalid/api/auth/me", {
        headers: { cookie: `${sessionCookie_1.SESSION_COOKIE_NAME}=${token}` },
    });
}
/* --------------- (a) the cookie itself ---------------------------- */
(0, node_test_1.test)("session cookie: first-party attributes mobile Safari accepts", () => {
    const header = (0, sessionCookie_1.sessionCookieHeader)("jwt.value.here");
    strict_1.default.equal(sessionCookie_1.SESSION_COOKIE_NAME, "mecha_session");
    strict_1.default.equal(sessionCookie_1.SESSION_COOKIE_MAX_AGE_SECONDS, 30 * 24 * 60 * 60, "Max-Age matches the JWT's 30-day life");
    strict_1.default.ok(header.startsWith("mecha_session=jwt.value.here"), "name + value");
    strict_1.default.ok(header.includes("Path=/"), "Path=/");
    strict_1.default.ok(header.includes("Secure"), "Secure");
    strict_1.default.ok(header.includes("SameSite=Lax"), "SameSite=Lax");
    strict_1.default.ok(header.includes("Max-Age=2592000"), "30-day Max-Age");
    strict_1.default.ok(!header.includes("SameSite=None"), "never SameSite=None");
    // Deliberately NOT HttpOnly: the client /app guard must read it
    // (the exposure class is the localStorage token's own).
    strict_1.default.ok(!header.includes("HttpOnly"), "not HttpOnly — the client guard reads this cookie");
    strict_1.default.ok((0, sessionCookie_1.clearedSessionCookieHeader)().includes("Max-Age=0"), "sign-out expires the cookie");
});
(0, node_test_1.test)("session cookie parsing: the token comes out of a real Cookie header", () => {
    strict_1.default.equal((0, sessionCookie_1.sessionTokenFromCookieHeader)("other=1; mecha_session=abc.def.ghi; theme=light"), "abc.def.ghi");
    strict_1.default.equal((0, sessionCookie_1.sessionTokenFromCookieHeader)("other=1; theme=light"), null, "no cookie → null");
    strict_1.default.equal((0, sessionCookie_1.sessionTokenFromCookieHeader)("mecha_session=; other=1"), null, "empty cookie → null");
    strict_1.default.equal((0, sessionCookie_1.sessionTokenFromCookieHeader)(null), null, "no header → null");
});
/* --------------- (b) the guards accept it ------------------------- */
(0, node_test_1.test)("server gate: a cookie-only request authenticates — no Bearer header needed", async () => {
    const store = new store_1.MemoryIdentityStore();
    const auth = await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    const payload = (0, jwt_1.bearerPayload)(cookieReq(auth.token));
    strict_1.default.ok(payload, "the cookie yields a verified payload");
    if (payload)
        strict_1.default.equal(payload.id, user.id);
    const authed = (0, routeAuth_1.requireAuth)(cookieReq(auth.token), ["driver"]);
    strict_1.default.ok("payload" in authed, "requireAuth admits a cookie-only driver");
    const gated = await (0, routeAuth_1.requireDriverUser)(cookieReq(auth.token), () => store);
    strict_1.default.ok("user" in gated, "the diagnosis gate admits a cookie-only driver");
    if ("user" in gated)
        strict_1.default.equal(gated.user.email, DRIVER.email);
});
(0, node_test_1.test)("server gate: a forged or expired cookie is still refused", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, DRIVER);
    strict_1.default.equal((0, jwt_1.bearerPayload)(cookieReq("not-a-real-token")), null, "garbage cookie → null");
    const expired = (0, jwt_1.signToken)({ id: "anyone", type: "driver" }, -3600);
    strict_1.default.equal((0, jwt_1.bearerPayload)(cookieReq(expired)), null, "expired cookie → null");
    const anon = (0, routeAuth_1.requireAuth)(new Request("http://test.invalid/api/auth/me"), ["driver"]);
    strict_1.default.ok("response" in anon && anon.response.status === 401, "no token anywhere → 401");
});
(0, node_test_1.test)("server gate: Bearer still wins when present, cookie is the fallback", () => {
    const token = (0, jwt_1.signToken)({ id: "someone", type: "driver" });
    const both = new Request("http://test.invalid/api/auth/me", {
        headers: { authorization: `Bearer ${token}`, cookie: `${sessionCookie_1.SESSION_COOKIE_NAME}=garbage` },
    });
    strict_1.default.ok((0, jwt_1.bearerPayload)(both), "a valid Bearer is used even with a bad cookie beside it");
    const cookieOnly = cookieReq(token);
    strict_1.default.ok((0, jwt_1.bearerPayload)(cookieOnly), "and the cookie carries it alone");
});
/* --------------- (a) the wiring: every completion sets it --------- */
(0, node_test_1.test)("route wiring: every auth completion response sets the session cookie", () => {
    const routes = [
        "app/api/auth/login/route.ts",
        "app/api/auth/register/route.ts",
        "app/api/auth/email-code/verify/route.ts",
        "app/api/auth/email-code/signup/route.ts",
        "app/api/auth/complete-phone/route.ts",
        "app/api/auth/session-bridge/route.ts",
        "app/api/business/login/route.ts",
        "app/api/business/register/route.ts",
    ];
    for (const file of routes) {
        const src = read(file);
        strict_1.default.ok(src.includes("withSessionCookie("), `${file} sets the session cookie on its success response`);
        strict_1.default.ok(src.includes('from "@/lib/server/sessionCookie"'), `${file} uses the shared session-cookie helper`);
    }
});
(0, node_test_1.test)("google establish: the top-level navigation route sets the cookie on its redirect", () => {
    const route = read("app/api/auth/google/establish/route.ts");
    strict_1.default.ok(route.includes("getBetterAuth()"), "the route reads the Better Auth session");
    strict_1.default.ok(route.includes("betterAuthSessionPayload"), "the route mints the standard app payload");
    strict_1.default.ok(route.includes("NextResponse.redirect"), "the route answers a redirect, not JSON");
    strict_1.default.ok(route.includes("withSessionCookie(response, payload.token)"), "the session cookie rides the redirect response");
    strict_1.default.ok(route.includes('raw === "/app" || raw.startsWith("/app/")'), "the destination is restricted to the dashboard and in-app paths");
    strict_1.default.ok(route.includes('"/login?error=google"'), "failures go back to login with the generic error");
});
(0, node_test_1.test)("google complete: the Better Auth door establishes via top-level navigation, never a fetch", () => {
    const page = read("app/auth/google/complete/page.tsx");
    strict_1.default.ok(page.includes("/api/auth/google/establish?to="), "the completion page navigates to the establish route");
    strict_1.default.ok(!page.includes('fetch("/api/auth/session-bridge")'), "the completion page no longer fetches the session into localStorage");
    strict_1.default.ok(page.includes('let target = "/app"'), "the default landing is still the dashboard");
});
(0, node_test_1.test)("client auth: the cookie is the source of truth the guard reads", () => {
    const auth = read("lib/client/auth.ts");
    strict_1.default.ok(auth.includes("readSessionCookie()"), "getToken reads the cookie");
    strict_1.default.ok(auth.includes("document.cookie"), "the cookie is read/written through document.cookie");
    strict_1.default.ok(auth.includes("writeSessionCookie(token)"), "saveSession mirrors the cookie client-side");
    strict_1.default.ok(auth.includes("expireSessionCookie()"), "sign-out retires the cookie");
    strict_1.default.ok(auth.includes("SameSite=Lax"), "the client mirror uses the same attributes");
});
(0, node_test_1.test)("dashboard: a cookie-only landing rebuilds the stored profile from the account record", () => {
    const page = read("app/app/page.tsx");
    strict_1.default.ok(page.includes("saveSession(token, {"), "the dashboard heals the profile mirror after /api/auth/me");
    strict_1.default.ok(page.includes("if (token && !getStoredUser())"), "the heal runs only when the mirror is missing");
});
