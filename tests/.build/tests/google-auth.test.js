"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Social login tests (Google sign-in package) — authorization URL,
 * OAuth state binding, ID-token verification (real RS256 against a
 * test JWKS), account resolution (sub / verified-email link / create),
 * the no-phone-gate rule (a phone-less Google account diagnoses on
 * the account alone — owner's rules, 2026-11-16), and the google-only
 * password-login error.
 *
 * Run: npm test. Everything runs against the in-memory store and the
 * STUB verifier — except the JWKS verifier tests, which verify real
 * signatures from a test RSA keypair served by an injected JWKS
 * fetcher. NO network, NO real Google calls, NO real database.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "google-auth-test-secret";
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.CLIENT_URL = "https://mechatech.test";
const authService_1 = require("../lib/server/authService");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const googleAuth_1 = require("../lib/server/googleAuth");
const provider_1 = require("../lib/server/provider");
const store_1 = require("../lib/server/store");
const CLAIMS = {
    sub: "google-sub-123",
    email: "rider@example.com",
    emailVerified: true,
    name: "Riley Rider",
};
function exchangeStub(idToken = "stub-id-token") {
    const calls = [];
    return {
        calls,
        exchangeCode: async (code) => {
            calls.push(code);
            return idToken;
        },
    };
}
async function drain(gen) {
    const out = [];
    for await (const event of gen)
        out.push(event);
    return out;
}
/* ------------------------- Configuration ------------------------- */
(0, node_test_1.test)("config gate: env toggles isGoogleConfigured; redirect URI derives from CLIENT_URL", () => {
    strict_1.default.equal((0, googleAuth_1.isGoogleConfigured)(), true);
    strict_1.default.equal((0, googleAuth_1.googleRedirectUri)(), "https://mechatech.test/api/auth/google/callback");
    const savedId = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
        strict_1.default.equal((0, googleAuth_1.isGoogleConfigured)(), false);
    }
    finally {
        process.env.GOOGLE_CLIENT_ID = savedId;
    }
    strict_1.default.equal((0, googleAuth_1.isGoogleConfigured)(), true);
});
(0, node_test_1.test)("authorize URL: client, redirect, scope, state, code flow", () => {
    const url = new URL((0, googleAuth_1.buildGoogleAuthorizeUrl)("state-abc"));
    strict_1.default.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    strict_1.default.equal(url.searchParams.get("client_id"), "test-client-id");
    strict_1.default.equal(url.searchParams.get("redirect_uri"), "https://mechatech.test/api/auth/google/callback");
    strict_1.default.equal(url.searchParams.get("response_type"), "code");
    strict_1.default.equal(url.searchParams.get("scope"), "openid email profile");
    strict_1.default.equal(url.searchParams.get("state"), "state-abc");
});
/* ------------------------- State binding ------------------------- */
(0, node_test_1.test)("callback: state mismatch is rejected before any exchange happens", async () => {
    const store = new store_1.MemoryIdentityStore();
    const exchange = exchangeStub();
    const verifier = new googleAuth_1.StubGoogleVerifier(CLAIMS);
    await strict_1.default.rejects((0, authService_1.completeGoogleSignIn)(store, { code: "code-1", state: "attacker-state", expectedState: "real-state" }, { verifier, exchangeCode: exchange.exchangeCode }), authService_1.GoogleStateMismatchError);
    await strict_1.default.rejects((0, authService_1.completeGoogleSignIn)(store, { code: "code-1", state: null, expectedState: null }, { verifier, exchangeCode: exchange.exchangeCode }), authService_1.GoogleStateMismatchError);
    strict_1.default.equal(exchange.calls.length, 0, "no code exchange on a state mismatch");
    strict_1.default.equal(verifier.calls.length, 0, "no token verification on a state mismatch");
    strict_1.default.equal(store.users.size, 0, "no account work on a state mismatch");
});
/* ------------------------- ID-token verification ------------------------- */
const NOW = 1_800_000_000;
const { publicKey, privateKey } = (0, node_crypto_1.generateKeyPairSync)("rsa", { modulusLength: 2048 });
const TEST_JWK = publicKey.export({ format: "jwk" });
TEST_JWK.kid = "test-key-1";
function googleToken(payload) {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const body = `${enc({ alg: "RS256", typ: "JWT", kid: "test-key-1" })}.${enc(payload)}`;
    const sig = (0, node_crypto_1.createSign)("RSA-SHA256").update(body).sign(privateKey).toString("base64url");
    return `${body}.${sig}`;
}
function jwksVerifier() {
    return new googleAuth_1.JwksGoogleVerifier({
        clientId: "test-client-id",
        fetchJwks: async () => ({ keys: [TEST_JWK] }),
        nowSeconds: () => NOW,
    });
}
const VALID_PAYLOAD = {
    iss: "https://accounts.google.com",
    aud: "test-client-id",
    exp: NOW + 600,
    sub: "google-sub-123",
    email: "rider@example.com",
    email_verified: true,
    name: "Riley Rider",
};
(0, node_test_1.test)("verifier: a properly signed Google token yields its claims", async () => {
    const claims = await jwksVerifier().verifyIdToken(googleToken(VALID_PAYLOAD));
    strict_1.default.deepEqual(claims, CLAIMS);
});
(0, node_test_1.test)("verifier: tampered payload (bad signature) is rejected", async () => {
    const token = googleToken(VALID_PAYLOAD);
    const [h, , s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...VALID_PAYLOAD, email: "attacker@example.com" })).toString("base64url");
    await strict_1.default.rejects(jwksVerifier().verifyIdToken(`${h}.${forgedPayload}.${s}`), googleAuth_1.GoogleTokenVerificationError);
});
(0, node_test_1.test)("verifier: wrong audience and expired tokens are rejected", async () => {
    await strict_1.default.rejects(jwksVerifier().verifyIdToken(googleToken({ ...VALID_PAYLOAD, aud: "someone-elses-client" })), googleAuth_1.GoogleTokenVerificationError);
    await strict_1.default.rejects(jwksVerifier().verifyIdToken(googleToken({ ...VALID_PAYLOAD, exp: NOW - 10 })), googleAuth_1.GoogleTokenVerificationError);
    await strict_1.default.rejects(jwksVerifier().verifyIdToken(googleToken({ ...VALID_PAYLOAD, iss: "https://evil.example" })), googleAuth_1.GoogleTokenVerificationError);
});
(0, node_test_1.test)("callback: a token the verifier rejects never reaches account resolution", async () => {
    const store = new store_1.MemoryIdentityStore();
    const exchange = exchangeStub();
    const verifier = new googleAuth_1.StubGoogleVerifier(new googleAuth_1.GoogleTokenVerificationError());
    await strict_1.default.rejects((0, authService_1.completeGoogleSignIn)(store, { code: "code-1", state: "s", expectedState: "s" }, { verifier, exchangeCode: exchange.exchangeCode }), googleAuth_1.GoogleTokenVerificationError);
    strict_1.default.equal(store.users.size, 0);
});
/* ------------------------- Account resolution ------------------------- */
(0, node_test_1.test)("callback success: standard payload shape (token, public user, quota)", async () => {
    const store = new store_1.MemoryIdentityStore();
    const exchange = exchangeStub();
    const result = await (0, authService_1.completeGoogleSignIn)(store, { code: "code-1", state: "s", expectedState: "s" }, { verifier: new googleAuth_1.StubGoogleVerifier(CLAIMS), exchangeCode: exchange.exchangeCode });
    strict_1.default.deepEqual(exchange.calls, ["code-1"]);
    strict_1.default.equal(result.token.split(".").length, 3, "a session JWT, like password sign-in");
    strict_1.default.equal(result.user.type, "driver");
    strict_1.default.equal(result.user.email, "rider@example.com");
    strict_1.default.equal(result.user.name, "Riley Rider");
    strict_1.default.equal(result.user.phone, null, "a Google-created account starts phone-less");
    strict_1.default.equal(result.user.emailVerified, true, "Google verified the email — stamped");
    strict_1.default.equal(result.quota.limit, 5);
    strict_1.default.equal(result.quota.remaining, 5);
});
(0, node_test_1.test)("resolution: google_sub signs the same account in, even if the profile email changed", async () => {
    const store = new store_1.MemoryIdentityStore();
    const first = await (0, authService_1.resolveGoogleAccount)(store, CLAIMS);
    const second = await (0, authService_1.resolveGoogleAccount)(store, {
        ...CLAIMS,
        email: "riley-renamed@example.com",
    });
    strict_1.default.equal(second.user.id, first.user.id);
    strict_1.default.equal(store.users.size, 1);
});
(0, node_test_1.test)("resolution: verified email links Google to the existing password account", async () => {
    const store = new store_1.MemoryIdentityStore();
    const registered = await (0, authService_1.registerDriver)(store, {
        name: "Riley Rider",
        email: "rider@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    strict_1.default.equal(registered.user.emailVerified, false, "starts unverified (soft gate)");
    const result = await (0, authService_1.resolveGoogleAccount)(store, CLAIMS);
    strict_1.default.equal(result.user.id, registered.user.id, "same account — no duplicate identity");
    strict_1.default.equal(result.user.emailVerified, true, "the verified link stamps email_verified_at");
    const record = await store.findUserById(registered.user.id);
    strict_1.default.equal(record?.googleSub, "google-sub-123");
    strict_1.default.equal(record?.authMethod, "both", "password + Google on one account");
    strict_1.default.ok(record?.passwordHash, "the password still works after linking");
    const login = await (0, authService_1.loginDriver)(store, {
        email: "rider@example.com",
        password: "correct horse battery",
    });
    strict_1.default.equal(login.user.id, registered.user.id);
});
(0, node_test_1.test)("resolution: an UNVERIFIED email claim never links", async () => {
    const store = new store_1.MemoryIdentityStore();
    const registered = await (0, authService_1.registerDriver)(store, {
        name: "Riley Rider",
        email: "rider@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    await strict_1.default.rejects((0, authService_1.resolveGoogleAccount)(store, { ...CLAIMS, emailVerified: false }), authService_1.GoogleLinkRefusedError);
    const record = await store.findUserById(registered.user.id);
    strict_1.default.equal(record?.googleSub, null, "nothing was linked");
});
/* ------------------- No phone gate (2026-11-16) ------------------- */
(0, node_test_1.test)("no phone gate: a Google-created phone-less account CAN consume a diagnosis on the account alone", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    const auth = await (0, authService_1.resolveGoogleAccount)(store, CLAIMS);
    const record = await store.findUserById(auth.user.id);
    strict_1.default.ok(record);
    strict_1.default.equal(record.passwordHash, null);
    strict_1.default.equal(record.phoneNormalized, null, "the account starts phone-less — and stays usable");
    const events = await drain((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: record, request: { problem: "Grinding noise when I brake" } }));
    strict_1.default.equal(provider.calls.length, 1, "the diagnosis runs with NO phone on file");
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done && done.type === "done");
    strict_1.default.equal(done.quota.remaining, 4, "exactly one free diagnosis consumed, keyed on the account");
    // Adding the number later (the optional card / deep-link page)
    // still works and changes nothing about the count.
    const completed = await (0, authService_1.completePhone)(store, auth.user.id, { phone: "(617) 555-0134" });
    strict_1.default.equal(completed.user.phone, "(617) 555-0134");
    strict_1.default.equal((await store.findUserById(auth.user.id))?.freeDiagnosesUsed, 1, "the count is untouched by the phone landing");
});
(0, node_test_1.test)("phone completion: a number owned by a DIFFERENT account is an honest conflict", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, {
        name: "Casey Driver",
        email: "casey@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    const auth = await (0, authService_1.resolveGoogleAccount)(store, CLAIMS);
    await strict_1.default.rejects((0, authService_1.completePhone)(store, auth.user.id, { phone: "6175550134" }), (err) => err instanceof store_1.IdentityConflictError && err.field === "phone");
    const record = await store.findUserById(auth.user.id);
    strict_1.default.equal(record?.phoneNormalized, null, "nothing was merged or overwritten");
});
/* ------------------------- Google-only password login ------------------------- */
(0, node_test_1.test)("password login on a Google-only account returns the specific error — never 'wrong password'", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.resolveGoogleAccount)(store, CLAIMS);
    await strict_1.default.rejects((0, authService_1.loginDriver)(store, { email: "rider@example.com", password: "anything at all" }), (err) => err instanceof authService_1.GoogleOnlyAccountError && err.code === "google_signin_required");
});
(0, node_test_1.test)("password login: wrong password on a password account is still the generic error", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, {
        name: "Casey Driver",
        email: "casey@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    await strict_1.default.rejects((0, authService_1.loginDriver)(store, { email: "casey@example.com", password: "wrong password" }), authService_1.InvalidCredentialsError);
});
