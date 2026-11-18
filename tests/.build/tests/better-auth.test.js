"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "better-auth-test-secret";
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.CLIENT_URL = "https://mechatech.test";
process.env.BETTER_AUTH_SECRET = "better-auth-test-secret-value-32chars";
process.env.BETTER_AUTH_URL = "https://mechatech.test";
process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";
const betterAuth_1 = require("../lib/server/betterAuth");
const betterAuthLink_1 = require("../lib/server/betterAuthLink");
const authService_1 = require("../lib/server/authService");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const jwt_1 = require("../lib/server/jwt");
const provider_1 = require("../lib/server/provider");
const store_1 = require("../lib/server/store");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
async function drain(gen) {
    const out = [];
    for await (const event of gen)
        out.push(event);
    return out;
}
/** The options factory never touches the Pool — a stand-in is fine. */
function options() {
    return (0, betterAuth_1.buildBetterAuthOptions)({});
}
/* --------------------- Engine configuration --------------------- */
(0, node_test_1.test)("config: email+password on, Google provider on, users table is the user model", async () => {
    const opts = options();
    strict_1.default.equal(opts.emailAndPassword?.enabled, true);
    // bcrypt plug-in: the app's own hash/verify, so legacy hashes work.
    strict_1.default.equal(typeof opts.emailAndPassword?.password?.hash, "function");
    strict_1.default.equal(typeof opts.emailAndPassword?.password?.verify, "function");
    const googleRaw = opts.socialProviders?.google;
    strict_1.default.ok(googleRaw, "google provider present when env is set");
    const google = typeof googleRaw === "function" ? await googleRaw() : googleRaw;
    strict_1.default.equal(google.clientId, "test-client-id");
    strict_1.default.equal(opts.user?.modelName, "users");
    strict_1.default.equal(opts.user?.fields?.emailVerified, "is_verified");
    strict_1.default.equal(opts.user?.fields?.image, "avatar");
    strict_1.default.equal(opts.user?.additionalFields?.phone?.input, true);
    strict_1.default.equal(opts.account?.modelName, "ba_account");
    strict_1.default.equal(opts.session?.modelName, "ba_session");
    strict_1.default.equal(opts.verification?.modelName, "ba_verification");
    strict_1.default.equal(opts.advanced?.database?.generateId, "uuid");
});
(0, node_test_1.test)("config: linking is verified-email-only — Google is NOT a trusted provider", () => {
    const linking = options().account?.accountLinking;
    strict_1.default.equal(linking?.enabled, true);
    strict_1.default.equal(linking?.allowDifferentEmails, false);
    // A trusted provider links even on an UNVERIFIED email claim —
    // the exact handover MECHA's identity rule forbids. Pin its absence.
    strict_1.default.equal(linking?.trustedProviders, undefined);
});
(0, node_test_1.test)("config: Google provider disappears when its env is absent", () => {
    const saved = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_SECRET;
    try {
        strict_1.default.equal(options().socialProviders?.google, undefined);
        strict_1.default.equal((0, betterAuth_1.isBetterAuthGoogleConfigured)(), false);
    }
    finally {
        process.env.GOOGLE_CLIENT_SECRET = saved;
    }
});
(0, node_test_1.test)("config: configured checks require DATABASE_URL + BETTER_AUTH_SECRET", () => {
    strict_1.default.equal((0, betterAuth_1.isBetterAuthConfigured)(), true);
    strict_1.default.equal((0, betterAuth_1.isBetterAuthGoogleConfigured)(), true);
    const savedSecret = process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_SECRET;
    try {
        strict_1.default.equal((0, betterAuth_1.isBetterAuthConfigured)(), false);
        strict_1.default.equal((0, betterAuth_1.isBetterAuthGoogleConfigured)(), false);
    }
    finally {
        process.env.BETTER_AUTH_SECRET = savedSecret;
    }
});
(0, node_test_1.test)("redirect URI: the Google Cloud client must carry /api/auth/callback/google", () => {
    strict_1.default.equal((0, betterAuth_1.betterAuthGoogleRedirectUri)("https://mechatech.io"), "https://mechatech.io/api/auth/callback/google");
    strict_1.default.equal((0, betterAuth_1.betterAuthGoogleRedirectUri)("https://mechatech.io/"), "https://mechatech.io/api/auth/callback/google");
    strict_1.default.equal((0, betterAuth_1.betterAuthGoogleRedirectUri)(), "https://mechatech.test/api/auth/callback/google");
});
/* --------------------- Unwired route honesty --------------------- */
(0, node_test_1.test)("routes: the handler + bridge exist, and unwired config yields no instance (the routes' 501 seam)", () => {
    // The suite's harness cannot load app route modules (the @/ alias
    // is a Next build feature), so route BEHAVIOR is verified in the
    // production smoke pass; here we pin the seam both routes share:
    // no env → getBetterAuth() is null → both answer their honest 501.
    const appDir = (0, node_path_1.join)(process.cwd(), "app");
    strict_1.default.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(appDir, "api", "auth", "[...all]", "route.ts")));
    strict_1.default.ok((0, node_fs_1.existsSync)((0, node_path_1.join)(appDir, "api", "auth", "session-bridge", "route.ts")));
    const savedDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
        strict_1.default.equal((0, betterAuth_1.getBetterAuth)(), null);
    }
    finally {
        process.env.DATABASE_URL = savedDb;
    }
});
/* ---------------- Google account creation + gate ---------------- */
(0, node_test_1.test)("google creation: the Better Auth write lands phone-less, sub-stamped — and diagnoses on the account alone", async () => {
    const store = new store_1.MemoryIdentityStore();
    const user = await (0, betterAuthLink_1.createGoogleUserViaBetterAuth)(store, {
        sub: "google-sub-ba-1",
        email: "newrider@example.com",
        name: "New Rider",
        emailVerified: true,
    });
    strict_1.default.equal(user.googleSub, "google-sub-ba-1");
    strict_1.default.equal(user.authMethod, "google");
    strict_1.default.equal(user.passwordHash, null);
    strict_1.default.equal(user.phone, null);
    strict_1.default.ok(user.emailVerifiedAt, "Google-verified email is stamped");
    const provider = new provider_1.StubDiagnosisProvider();
    const events = await drain((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: { problem: "Grinding noise when I brake" } }));
    strict_1.default.equal(provider.calls.length, 1, "the diagnosis runs with NO phone on file");
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done && done.type === "done");
    strict_1.default.equal(done.quota.remaining, 4, "exactly one free diagnosis consumed, keyed on the account");
    // The number can still land later (optional card / deep link) —
    // and the count does not move.
    await (0, authService_1.completePhone)(store, user.id, { phone: "(617) 555-0134" });
    strict_1.default.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 1, "the count is untouched by the phone landing");
});
/* --------------------------- Linking ---------------------------- */
(0, node_test_1.test)("link: a verified Google link stamps the existing password account — no duplicate", async () => {
    const store = new store_1.MemoryIdentityStore();
    const registered = await (0, authService_1.registerDriver)(store, {
        name: "Pat Password",
        email: "pat@example.com",
        phone: "(617) 555-0100",
        password: "correct horse battery",
        confirmPassword: "correct horse battery",
    });
    // Better Auth links by verified email inside its engine; the hook
    // then performs this stamp on the SAME row.
    const linked = await (0, betterAuthLink_1.applyGoogleAccountLink)(store, {
        userId: registered.user.id,
        googleSub: "google-sub-pat",
    });
    strict_1.default.ok(linked);
    strict_1.default.equal(linked.id, registered.user.id, "same account — never a duplicate");
    strict_1.default.equal(linked.googleSub, "google-sub-pat");
    strict_1.default.equal(linked.authMethod, "both");
    // The password keeps working after the link.
    const login = await (0, authService_1.loginDriver)(store, {
        email: "pat@example.com",
        password: "correct horse battery",
    });
    strict_1.default.equal(login.user.id, registered.user.id);
    // Idempotent: the hook firing twice changes nothing.
    const again = await (0, betterAuthLink_1.applyGoogleAccountLink)(store, {
        userId: registered.user.id,
        googleSub: "google-sub-pat",
    });
    strict_1.default.equal(again?.googleSub, "google-sub-pat");
});
(0, node_test_1.test)("link refusal: an unverified Google email claim links NOTHING", async () => {
    const store = new store_1.MemoryIdentityStore();
    const registered = await (0, authService_1.registerDriver)(store, {
        name: "Vera Verified",
        email: "vera@example.com",
        password: "vera password 1",
        confirmPassword: "vera password 1",
    });
    // The policy both doors share: Better Auth's config pins it (no
    // trusted providers, above); the resolver enforces it here.
    await strict_1.default.rejects((0, authService_1.resolveGoogleAccount)(store, {
        sub: "google-sub-unverified",
        email: "vera@example.com",
        emailVerified: false,
        name: "Vera Verified",
    }), authService_1.GoogleLinkRefusedError);
    const record = await store.findUserById(registered.user.id);
    strict_1.default.equal(record?.googleSub, null, "nothing was linked");
});
/* ------------------- Legacy Google-only users ------------------- */
(0, node_test_1.test)("legacy google-only user: Google sign-in lands in the ETL account; password door stays honest", async () => {
    const store = new store_1.MemoryIdentityStore();
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
    const result = await (0, authService_1.resolveGoogleAccount)(store, {
        sub: "google-sub-legacy",
        email: "lou@example.com",
        emailVerified: true,
        name: "Legacy Lou",
    });
    strict_1.default.equal(result.user.id, legacy.id, "the existing account — not a fresh one");
    await strict_1.default.rejects((0, authService_1.loginDriver)(store, { email: "lou@example.com", password: "anything123" }), authService_1.GoogleOnlyAccountError);
});
/* ------------------------- Session bridge ------------------------ */
(0, node_test_1.test)("bridge: the payload is the standard {token, user, quota} shape, token verifies", async () => {
    const store = new store_1.MemoryIdentityStore();
    const user = await (0, betterAuthLink_1.createGoogleUserViaBetterAuth)(store, {
        sub: "google-sub-bridge",
        email: "bridge@example.com",
        name: "Bridge Bea",
        emailVerified: true,
    });
    const payload = await (0, betterAuthLink_1.betterAuthSessionPayload)(store, user.id);
    strict_1.default.ok(payload);
    strict_1.default.deepEqual(Object.keys(payload).sort(), ["quota", "token", "user"]);
    const verified = (0, jwt_1.verifyToken)(payload.token);
    strict_1.default.equal(verified?.id, user.id);
    strict_1.default.equal(verified?.type, "driver");
    strict_1.default.equal(payload.user.email, "bridge@example.com");
    strict_1.default.equal(payload.user.type, "driver");
    strict_1.default.equal(payload.quota.limit, 5);
    strict_1.default.equal(payload.quota.remaining, 5);
    strict_1.default.equal(await (0, betterAuthLink_1.betterAuthSessionPayload)(store, "no-such-user"), null);
});
