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
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "session-cookie-test-secret";

import { registerDriver } from "../lib/server/authService";
import { bearerPayload, signToken } from "../lib/server/jwt";
import { requireAuth, requireDriverUser } from "../lib/server/routeAuth";
import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  clearedSessionCookieHeader,
  sessionCookieHeader,
  sessionTokenFromCookieHeader,
} from "../lib/server/sessionCookie";
import { MemoryIdentityStore } from "../lib/server/store";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const DRIVER = {
  name: "Session Tester",
  email: "session@example.com",
  phone: "(617) 555-0118",
  password: "correct horse battery",
};

function cookieReq(token: string): Request {
  return new Request("http://test.invalid/api/auth/me", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

/* --------------- (a) the cookie itself ---------------------------- */

test("session cookie: first-party attributes mobile Safari accepts", () => {
  const header = sessionCookieHeader("jwt.value.here");
  assert.equal(SESSION_COOKIE_NAME, "mecha_session");
  assert.equal(SESSION_COOKIE_MAX_AGE_SECONDS, 30 * 24 * 60 * 60, "Max-Age matches the JWT's 30-day life");
  assert.ok(header.startsWith("mecha_session=jwt.value.here"), "name + value");
  assert.ok(header.includes("Path=/"), "Path=/");
  assert.ok(header.includes("Secure"), "Secure");
  assert.ok(header.includes("SameSite=Lax"), "SameSite=Lax");
  assert.ok(header.includes("Max-Age=2592000"), "30-day Max-Age");
  assert.ok(!header.includes("SameSite=None"), "never SameSite=None");
  // Deliberately NOT HttpOnly: the client /app guard must read it
  // (the exposure class is the localStorage token's own).
  assert.ok(!header.includes("HttpOnly"), "not HttpOnly — the client guard reads this cookie");
  assert.ok(clearedSessionCookieHeader().includes("Max-Age=0"), "sign-out expires the cookie");
});

test("session cookie parsing: the token comes out of a real Cookie header", () => {
  assert.equal(
    sessionTokenFromCookieHeader("other=1; mecha_session=abc.def.ghi; theme=light"),
    "abc.def.ghi",
  );
  assert.equal(sessionTokenFromCookieHeader("other=1; theme=light"), null, "no cookie → null");
  assert.equal(sessionTokenFromCookieHeader("mecha_session=; other=1"), null, "empty cookie → null");
  assert.equal(sessionTokenFromCookieHeader(null), null, "no header → null");
});

/* --------------- (b) the guards accept it ------------------------- */

test("server gate: a cookie-only request authenticates — no Bearer header needed", async () => {
  const store = new MemoryIdentityStore();
  const auth = await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail(DRIVER.email);
  assert.ok(user);

  const payload = bearerPayload(cookieReq(auth.token));
  assert.ok(payload, "the cookie yields a verified payload");
  if (payload) assert.equal(payload.id, user.id);

  const authed = requireAuth(cookieReq(auth.token), ["driver"]);
  assert.ok("payload" in authed, "requireAuth admits a cookie-only driver");

  const gated = await requireDriverUser(cookieReq(auth.token), () => store);
  assert.ok("user" in gated, "the diagnosis gate admits a cookie-only driver");
  if ("user" in gated) assert.equal(gated.user.email, DRIVER.email);
});

test("server gate: a forged or expired cookie is still refused", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);

  assert.equal(bearerPayload(cookieReq("not-a-real-token")), null, "garbage cookie → null");
  const expired = signToken({ id: "anyone", type: "driver" }, -3600);
  assert.equal(bearerPayload(cookieReq(expired)), null, "expired cookie → null");

  const anon = requireAuth(new Request("http://test.invalid/api/auth/me"), ["driver"]);
  assert.ok("response" in anon && anon.response.status === 401, "no token anywhere → 401");
});

test("server gate: Bearer still wins when present, cookie is the fallback", () => {
  const token = signToken({ id: "someone", type: "driver" });
  const both = new Request("http://test.invalid/api/auth/me", {
    headers: { authorization: `Bearer ${token}`, cookie: `${SESSION_COOKIE_NAME}=garbage` },
  });
  assert.ok(bearerPayload(both), "a valid Bearer is used even with a bad cookie beside it");
  const cookieOnly = cookieReq(token);
  assert.ok(bearerPayload(cookieOnly), "and the cookie carries it alone");
});

/* --------------- (a) the wiring: every completion sets it --------- */

test("route wiring: every auth completion response sets the session cookie", () => {
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
    assert.ok(src.includes("withSessionCookie("), `${file} sets the session cookie on its success response`);
    assert.ok(
      src.includes('from "@/lib/server/sessionCookie"'),
      `${file} uses the shared session-cookie helper`,
    );
  }
});

test("google establish: the top-level navigation route sets the cookie on its redirect", () => {
  const route = read("app/api/auth/google/establish/route.ts");
  assert.ok(route.includes("getBetterAuth()"), "the route reads the Better Auth session");
  assert.ok(route.includes("betterAuthSessionPayload"), "the route mints the standard app payload");
  assert.ok(route.includes("NextResponse.redirect"), "the route answers a redirect, not JSON");
  assert.ok(
    route.includes("withSessionCookie(response, payload.token)"),
    "the session cookie rides the redirect response",
  );
  assert.ok(
    route.includes('raw === "/app" || raw.startsWith("/app/")'),
    "the destination is restricted to the dashboard and in-app paths",
  );
  assert.ok(route.includes('"/login?error=google"'), "failures go back to login with the generic error");
});

test("google complete: the Better Auth door establishes via top-level navigation, never a fetch", () => {
  const page = read("app/auth/google/complete/page.tsx");
  assert.ok(
    page.includes("/api/auth/google/establish?to="),
    "the completion page navigates to the establish route",
  );
  assert.ok(
    !page.includes('fetch("/api/auth/session-bridge")'),
    "the completion page no longer fetches the session into localStorage",
  );
  assert.ok(page.includes('let target = "/app"'), "the default landing is still the dashboard");
});

test("client auth: the cookie is the source of truth the guard reads", () => {
  const auth = read("lib/client/auth.ts");
  assert.ok(auth.includes("readSessionCookie()"), "getToken reads the cookie");
  assert.ok(auth.includes("document.cookie"), "the cookie is read/written through document.cookie");
  assert.ok(auth.includes("writeSessionCookie(token)"), "saveSession mirrors the cookie client-side");
  assert.ok(auth.includes("expireSessionCookie()"), "sign-out retires the cookie");
  assert.ok(auth.includes("SameSite=Lax"), "the client mirror uses the same attributes");
});

test("dashboard: a cookie-only landing rebuilds the stored profile from the account record", () => {
  const page = read("app/app/page.tsx");
  assert.ok(
    page.includes("saveSession(token, {"),
    "the dashboard heals the profile mirror after /api/auth/me",
  );
  assert.ok(
    page.includes("if (token && !getStoredUser())"),
    "the heal runs only when the mirror is missing",
  );
});
