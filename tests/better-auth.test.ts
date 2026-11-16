/**
 * Better Auth integration tests (AUTH DECISION 2026-11-06) — the
 * options factory's security-relevant shape (Google provider gating,
 * verified-email-only linking, users-table mapping, uuid ids), the
 * honest 501s of the unwired routes, and the identity behavior MECHA
 * owns on top of the engine: Google account creation landing in the
 * `users` table, the account-link stamp, the no-phone-gate rule (a
 * phone-less Google account diagnoses on the account alone —
 * owner's rules, 2026-11-16), legacy Google-only
 * users (google_sub set, password NULL) signing in to their existing
 * account, and the session bridge's standard payload shape.
 *
 * Better Auth's engine internals (its OAuth state machine, its own
 * adapter CRUD) are covered by Better Auth's upstream suite; its
 * writes land through the IdentityStore seams tested here — the same
 * in-memory-store pattern as the rest of this suite. NO network, NO
 * real Google calls, NO real database. Run: npm test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "better-auth-test-secret";
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.CLIENT_URL = "https://mechatech.test";
process.env.BETTER_AUTH_SECRET = "better-auth-test-secret-value-32chars";
process.env.BETTER_AUTH_URL = "https://mechatech.test";
process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";

import {
  betterAuthGoogleRedirectUri,
  buildBetterAuthOptions,
  getBetterAuth,
  isBetterAuthConfigured,
  isBetterAuthGoogleConfigured,
} from "../lib/server/betterAuth";
import {
  applyGoogleAccountLink,
  betterAuthSessionPayload,
  createGoogleUserViaBetterAuth,
} from "../lib/server/betterAuthLink";
import {
  GoogleLinkRefusedError,
  GoogleOnlyAccountError,
  completePhone,
  loginDriver,
  registerDriver,
  resolveGoogleAccount,
} from "../lib/server/authService";
import { executeDiagnosis } from "../lib/server/diagnoseService";
import { verifyToken } from "../lib/server/jwt";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { MemoryIdentityStore } from "../lib/server/store";
import { existsSync } from "node:fs";
import { join } from "node:path";

async function drain<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const event of gen) out.push(event);
  return out;
}

/** The options factory never touches the Pool — a stand-in is fine. */
function options() {
  return buildBetterAuthOptions({} as never);
}

/* --------------------- Engine configuration --------------------- */

test("config: email+password on, Google provider on, users table is the user model", async () => {
  const opts = options();
  assert.equal(opts.emailAndPassword?.enabled, true);
  // bcrypt plug-in: the app's own hash/verify, so legacy hashes work.
  assert.equal(typeof opts.emailAndPassword?.password?.hash, "function");
  assert.equal(typeof opts.emailAndPassword?.password?.verify, "function");
  const googleRaw = opts.socialProviders?.google;
  assert.ok(googleRaw, "google provider present when env is set");
  const google = typeof googleRaw === "function" ? await googleRaw() : googleRaw;
  assert.equal(google.clientId, "test-client-id");
  assert.equal(opts.user?.modelName, "users");
  assert.equal(opts.user?.fields?.emailVerified, "is_verified");
  assert.equal(opts.user?.fields?.image, "avatar");
  assert.equal(opts.user?.additionalFields?.phone?.input, true);
  assert.equal(opts.account?.modelName, "ba_account");
  assert.equal(opts.session?.modelName, "ba_session");
  assert.equal(opts.verification?.modelName, "ba_verification");
  assert.equal(opts.advanced?.database?.generateId, "uuid");
});

test("config: linking is verified-email-only — Google is NOT a trusted provider", () => {
  const linking = options().account?.accountLinking;
  assert.equal(linking?.enabled, true);
  assert.equal(linking?.allowDifferentEmails, false);
  // A trusted provider links even on an UNVERIFIED email claim —
  // the exact handover MECHA's identity rule forbids. Pin its absence.
  assert.equal(linking?.trustedProviders, undefined);
});

test("config: Google provider disappears when its env is absent", () => {
  const saved = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_SECRET;
  try {
    assert.equal(options().socialProviders?.google, undefined);
    assert.equal(isBetterAuthGoogleConfigured(), false);
  } finally {
    process.env.GOOGLE_CLIENT_SECRET = saved;
  }
});

test("config: configured checks require DATABASE_URL + BETTER_AUTH_SECRET", () => {
  assert.equal(isBetterAuthConfigured(), true);
  assert.equal(isBetterAuthGoogleConfigured(), true);
  const savedSecret = process.env.BETTER_AUTH_SECRET;
  delete process.env.BETTER_AUTH_SECRET;
  try {
    assert.equal(isBetterAuthConfigured(), false);
    assert.equal(isBetterAuthGoogleConfigured(), false);
  } finally {
    process.env.BETTER_AUTH_SECRET = savedSecret;
  }
});

test("redirect URI: the Google Cloud client must carry /api/auth/callback/google", () => {
  assert.equal(
    betterAuthGoogleRedirectUri("https://mechatech.io"),
    "https://mechatech.io/api/auth/callback/google",
  );
  assert.equal(
    betterAuthGoogleRedirectUri("https://mechatech.io/"),
    "https://mechatech.io/api/auth/callback/google",
  );
  assert.equal(
    betterAuthGoogleRedirectUri(),
    "https://mechatech.test/api/auth/callback/google",
  );
});

/* --------------------- Unwired route honesty --------------------- */

test("routes: the handler + bridge exist, and unwired config yields no instance (the routes' 501 seam)", () => {
  // The suite's harness cannot load app route modules (the @/ alias
  // is a Next build feature), so route BEHAVIOR is verified in the
  // production smoke pass; here we pin the seam both routes share:
  // no env → getBetterAuth() is null → both answer their honest 501.
  const appDir = join(process.cwd(), "app");
  assert.ok(existsSync(join(appDir, "api", "auth", "[...all]", "route.ts")));
  assert.ok(existsSync(join(appDir, "api", "auth", "session-bridge", "route.ts")));
  const savedDb = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal(getBetterAuth(), null);
  } finally {
    process.env.DATABASE_URL = savedDb;
  }
});

/* ---------------- Google account creation + gate ---------------- */

test("google creation: the Better Auth write lands phone-less, sub-stamped — and diagnoses on the account alone", async () => {
  const store = new MemoryIdentityStore();
  const user = await createGoogleUserViaBetterAuth(store, {
    sub: "google-sub-ba-1",
    email: "newrider@example.com",
    name: "New Rider",
    emailVerified: true,
  });
  assert.equal(user.googleSub, "google-sub-ba-1");
  assert.equal(user.authMethod, "google");
  assert.equal(user.passwordHash, null);
  assert.equal(user.phone, null);
  assert.ok(user.emailVerifiedAt, "Google-verified email is stamped");

  const provider = new StubDiagnosisProvider();
  const events = await drain(
    executeDiagnosis(
      { store, provider },
      { user, request: { problem: "Grinding noise when I brake" } },
    ),
  );
  assert.equal(provider.calls.length, 1, "the diagnosis runs with NO phone on file");
  const done = events.find((e) => e.type === "done");
  assert.ok(done && done.type === "done");
  assert.equal(done.quota.remaining, 4, "exactly one free diagnosis consumed, keyed on the account");

  // The number can still land later (optional card / deep link) —
  // and the count does not move.
  await completePhone(store, user.id, { phone: "(617) 555-0134" });
  assert.equal(
    (await store.findUserById(user.id))?.freeDiagnosesUsed,
    1,
    "the count is untouched by the phone landing",
  );
});

/* --------------------------- Linking ---------------------------- */

test("link: a verified Google link stamps the existing password account — no duplicate", async () => {
  const store = new MemoryIdentityStore();
  const registered = await registerDriver(store, {
    name: "Pat Password",
    email: "pat@example.com",
    phone: "(617) 555-0100",
    password: "correct horse battery",
    confirmPassword: "correct horse battery",
  });
  // Better Auth links by verified email inside its engine; the hook
  // then performs this stamp on the SAME row.
  const linked = await applyGoogleAccountLink(store, {
    userId: registered.user.id,
    googleSub: "google-sub-pat",
  });
  assert.ok(linked);
  assert.equal(linked.id, registered.user.id, "same account — never a duplicate");
  assert.equal(linked.googleSub, "google-sub-pat");
  assert.equal(linked.authMethod, "both");
  // The password keeps working after the link.
  const login = await loginDriver(store, {
    email: "pat@example.com",
    password: "correct horse battery",
  });
  assert.equal(login.user.id, registered.user.id);
  // Idempotent: the hook firing twice changes nothing.
  const again = await applyGoogleAccountLink(store, {
    userId: registered.user.id,
    googleSub: "google-sub-pat",
  });
  assert.equal(again?.googleSub, "google-sub-pat");
});

test("link refusal: an unverified Google email claim links NOTHING", async () => {
  const store = new MemoryIdentityStore();
  const registered = await registerDriver(store, {
    name: "Vera Verified",
    email: "vera@example.com",
    password: "vera password 1",
    confirmPassword: "vera password 1",
  });
  // The policy both doors share: Better Auth's config pins it (no
  // trusted providers, above); the resolver enforces it here.
  await assert.rejects(
    resolveGoogleAccount(store, {
      sub: "google-sub-unverified",
      email: "vera@example.com",
      emailVerified: false,
      name: "Vera Verified",
    }),
    GoogleLinkRefusedError,
  );
  const record = await store.findUserById(registered.user.id);
  assert.equal(record?.googleSub, null, "nothing was linked");
});

/* ------------------- Legacy Google-only users ------------------- */

test("legacy google-only user: Google sign-in lands in the ETL account; password door stays honest", async () => {
  const store = new MemoryIdentityStore();
  // The ETL shape: google_sub set, password_hash NULL (0002).
  const legacy = await store.createUser({
    name: "Legacy Lou",
    email: "lou@example.com",
    phone: "(617) 555-0111",
    phoneNormalized: "6175550111",
    passwordHash: null,
    googleSub: "google-sub-legacy",
    authMethod: "google",
  });
  const result = await resolveGoogleAccount(store, {
    sub: "google-sub-legacy",
    email: "lou@example.com",
    emailVerified: true,
    name: "Legacy Lou",
  });
  assert.equal(result.user.id, legacy.id, "the existing account — not a fresh one");
  await assert.rejects(
    loginDriver(store, { email: "lou@example.com", password: "anything123" }),
    GoogleOnlyAccountError,
  );
});

/* ------------------------- Session bridge ------------------------ */

test("bridge: the payload is the standard {token, user, quota} shape, token verifies", async () => {
  const store = new MemoryIdentityStore();
  const user = await createGoogleUserViaBetterAuth(store, {
    sub: "google-sub-bridge",
    email: "bridge@example.com",
    name: "Bridge Bea",
    emailVerified: true,
  });
  const payload = await betterAuthSessionPayload(store, user.id);
  assert.ok(payload);
  assert.deepEqual(Object.keys(payload).sort(), ["quota", "token", "user"]);
  const verified = verifyToken(payload.token);
  assert.equal(verified?.id, user.id);
  assert.equal(verified?.type, "driver");
  assert.equal(payload.user.email, "bridge@example.com");
  assert.equal(payload.user.type, "driver");
  assert.equal(payload.quota.limit, 5);
  assert.equal(payload.quota.remaining, 5);
  assert.equal(await betterAuthSessionPayload(store, "no-such-user"), null);
});
