/**
 * Social login tests (Google sign-in package) — authorization URL,
 * OAuth state binding, ID-token verification (real RS256 against a
 * test JWKS), account resolution (sub / verified-email link / create),
 * the phone-completion gate on diagnoses, and the google-only
 * password-login error.
 *
 * Run: npm test. Everything runs against the in-memory store and the
 * STUB verifier — except the JWKS verifier tests, which verify real
 * signatures from a test RSA keypair served by an injected JWKS
 * fetcher. NO network, NO real Google calls, NO real database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type JsonWebKey } from "node:crypto";

// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "google-auth-test-secret";
process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
process.env.CLIENT_URL = "https://mechatech.test";

import {
  GoogleLinkRefusedError,
  GoogleOnlyAccountError,
  GoogleStateMismatchError,
  InvalidCredentialsError,
  completeGoogleSignIn,
  completePhone,
  loginDriver,
  registerDriver,
  resolveGoogleAccount,
} from "../lib/server/authService";
import { PhoneRequiredError, executeDiagnosis } from "../lib/server/diagnoseService";
import {
  GoogleTokenVerificationError,
  JwksGoogleVerifier,
  StubGoogleVerifier,
  buildGoogleAuthorizeUrl,
  googleRedirectUri,
  isGoogleConfigured,
  type GoogleIdTokenClaims,
} from "../lib/server/googleAuth";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { IdentityConflictError, MemoryIdentityStore } from "../lib/server/store";

const CLAIMS: GoogleIdTokenClaims = {
  sub: "google-sub-123",
  email: "rider@example.com",
  emailVerified: true,
  name: "Riley Rider",
};

function exchangeStub(idToken = "stub-id-token") {
  const calls: string[] = [];
  return {
    calls,
    exchangeCode: async (code: string) => {
      calls.push(code);
      return idToken;
    },
  };
}

async function drain<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const event of gen) out.push(event);
  return out;
}

/* ------------------------- Configuration ------------------------- */

test("config gate: env toggles isGoogleConfigured; redirect URI derives from CLIENT_URL", () => {
  assert.equal(isGoogleConfigured(), true);
  assert.equal(googleRedirectUri(), "https://mechatech.test/api/auth/google/callback");
  const savedId = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  try {
    assert.equal(isGoogleConfigured(), false);
  } finally {
    process.env.GOOGLE_CLIENT_ID = savedId;
  }
  assert.equal(isGoogleConfigured(), true);
});

test("authorize URL: client, redirect, scope, state, code flow", () => {
  const url = new URL(buildGoogleAuthorizeUrl("state-abc"));
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), "test-client-id");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "https://mechatech.test/api/auth/google/callback",
  );
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("state"), "state-abc");
});

/* ------------------------- State binding ------------------------- */

test("callback: state mismatch is rejected before any exchange happens", async () => {
  const store = new MemoryIdentityStore();
  const exchange = exchangeStub();
  const verifier = new StubGoogleVerifier(CLAIMS);
  await assert.rejects(
    completeGoogleSignIn(
      store,
      { code: "code-1", state: "attacker-state", expectedState: "real-state" },
      { verifier, exchangeCode: exchange.exchangeCode },
    ),
    GoogleStateMismatchError,
  );
  await assert.rejects(
    completeGoogleSignIn(
      store,
      { code: "code-1", state: null, expectedState: null },
      { verifier, exchangeCode: exchange.exchangeCode },
    ),
    GoogleStateMismatchError,
  );
  assert.equal(exchange.calls.length, 0, "no code exchange on a state mismatch");
  assert.equal(verifier.calls.length, 0, "no token verification on a state mismatch");
  assert.equal(store.users.size, 0, "no account work on a state mismatch");
});

/* ------------------------- ID-token verification ------------------------- */

const NOW = 1_800_000_000;
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const TEST_JWK = publicKey.export({ format: "jwk" }) as JsonWebKey;
(TEST_JWK as Record<string, unknown>).kid = "test-key-1";

function googleToken(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const body = `${enc({ alg: "RS256", typ: "JWT", kid: "test-key-1" })}.${enc(payload)}`;
  const sig = createSign("RSA-SHA256").update(body).sign(privateKey).toString("base64url");
  return `${body}.${sig}`;
}

function jwksVerifier(): JwksGoogleVerifier {
  return new JwksGoogleVerifier({
    clientId: "test-client-id",
    fetchJwks: async () => ({ keys: [TEST_JWK as never] }),
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

test("verifier: a properly signed Google token yields its claims", async () => {
  const claims = await jwksVerifier().verifyIdToken(googleToken(VALID_PAYLOAD));
  assert.deepEqual(claims, CLAIMS);
});

test("verifier: tampered payload (bad signature) is rejected", async () => {
  const token = googleToken(VALID_PAYLOAD);
  const [h, , s] = token.split(".");
  const forgedPayload = Buffer.from(
    JSON.stringify({ ...VALID_PAYLOAD, email: "attacker@example.com" }),
  ).toString("base64url");
  await assert.rejects(
    jwksVerifier().verifyIdToken(`${h}.${forgedPayload}.${s}`),
    GoogleTokenVerificationError,
  );
});

test("verifier: wrong audience and expired tokens are rejected", async () => {
  await assert.rejects(
    jwksVerifier().verifyIdToken(googleToken({ ...VALID_PAYLOAD, aud: "someone-elses-client" })),
    GoogleTokenVerificationError,
  );
  await assert.rejects(
    jwksVerifier().verifyIdToken(googleToken({ ...VALID_PAYLOAD, exp: NOW - 10 })),
    GoogleTokenVerificationError,
  );
  await assert.rejects(
    jwksVerifier().verifyIdToken(googleToken({ ...VALID_PAYLOAD, iss: "https://evil.example" })),
    GoogleTokenVerificationError,
  );
});

test("callback: a token the verifier rejects never reaches account resolution", async () => {
  const store = new MemoryIdentityStore();
  const exchange = exchangeStub();
  const verifier = new StubGoogleVerifier(new GoogleTokenVerificationError());
  await assert.rejects(
    completeGoogleSignIn(
      store,
      { code: "code-1", state: "s", expectedState: "s" },
      { verifier, exchangeCode: exchange.exchangeCode },
    ),
    GoogleTokenVerificationError,
  );
  assert.equal(store.users.size, 0);
});

/* ------------------------- Account resolution ------------------------- */

test("callback success: standard payload shape (token, public user, quota)", async () => {
  const store = new MemoryIdentityStore();
  const exchange = exchangeStub();
  const result = await completeGoogleSignIn(
    store,
    { code: "code-1", state: "s", expectedState: "s" },
    { verifier: new StubGoogleVerifier(CLAIMS), exchangeCode: exchange.exchangeCode },
  );
  assert.deepEqual(exchange.calls, ["code-1"]);
  assert.equal(result.token.split(".").length, 3, "a session JWT, like password sign-in");
  assert.equal(result.user.type, "driver");
  assert.equal(result.user.email, "rider@example.com");
  assert.equal(result.user.name, "Riley Rider");
  assert.equal(result.user.phone, null, "a Google-created account starts phone-less");
  assert.equal(result.user.emailVerified, true, "Google verified the email — stamped");
  assert.equal(result.quota.limit, 5);
  assert.equal(result.quota.remaining, 5);
});

test("resolution: google_sub signs the same account in, even if the profile email changed", async () => {
  const store = new MemoryIdentityStore();
  const first = await resolveGoogleAccount(store, CLAIMS);
  const second = await resolveGoogleAccount(store, {
    ...CLAIMS,
    email: "riley-renamed@example.com",
  });
  assert.equal(second.user.id, first.user.id);
  assert.equal(store.users.size, 1);
});

test("resolution: verified email links Google to the existing password account", async () => {
  const store = new MemoryIdentityStore();
  const registered = await registerDriver(store, {
    name: "Riley Rider",
    email: "rider@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  assert.equal(registered.user.emailVerified, false, "starts unverified (soft gate)");

  const result = await resolveGoogleAccount(store, CLAIMS);
  assert.equal(result.user.id, registered.user.id, "same account — no duplicate identity");
  assert.equal(result.user.emailVerified, true, "the verified link stamps email_verified_at");
  const record = await store.findUserById(registered.user.id);
  assert.equal(record?.googleSub, "google-sub-123");
  assert.equal(record?.authMethod, "both", "password + Google on one account");
  assert.ok(record?.passwordHash, "the password still works after linking");
  const login = await loginDriver(store, {
    email: "rider@example.com",
    password: "correct horse battery",
  });
  assert.equal(login.user.id, registered.user.id);
});

test("resolution: an UNVERIFIED email claim never links", async () => {
  const store = new MemoryIdentityStore();
  const registered = await registerDriver(store, {
    name: "Riley Rider",
    email: "rider@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  await assert.rejects(
    resolveGoogleAccount(store, { ...CLAIMS, emailVerified: false }),
    GoogleLinkRefusedError,
  );
  const record = await store.findUserById(registered.user.id);
  assert.equal(record?.googleSub, null, "nothing was linked");
});

/* ------------------------- The phone gate ------------------------- */

test("phone gate: a Google-created account cannot consume a diagnosis until the phone lands", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const auth = await resolveGoogleAccount(store, CLAIMS);
  const record = await store.findUserById(auth.user.id);
  assert.ok(record);
  assert.equal(record.passwordHash, null);
  assert.equal(record.phoneNormalized, null);

  await assert.rejects(
    drain(
      executeDiagnosis(
        { store, provider },
        { user: record, request: { problem: "Grinding noise when I brake" } },
      ),
    ),
    PhoneRequiredError,
  );
  assert.equal(provider.calls.length, 0, "the AI provider is never reached");
  const untouched = await store.findUserById(auth.user.id);
  assert.equal(untouched?.freeDiagnosesUsed, 0, "no quota was consumed");

  const completed = await completePhone(store, auth.user.id, { phone: "(617) 555-0134" });
  assert.equal(completed.user.phone, "(617) 555-0134");
  const ready = await store.findUserById(auth.user.id);
  assert.ok(ready);
  const events = await drain(
    executeDiagnosis(
      { store, provider },
      { user: ready, request: { problem: "Grinding noise when I brake" } },
    ),
  );
  assert.equal(provider.calls.length, 1, "after completion the diagnosis runs");
  const done = events.find((e) => e.type === "done");
  assert.ok(done && done.type === "done");
  assert.equal(done.quota.remaining, 4, "exactly one free diagnosis consumed");
});

test("phone completion: a number owned by a DIFFERENT account is an honest conflict", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, {
    name: "Casey Driver",
    email: "casey@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  const auth = await resolveGoogleAccount(store, CLAIMS);
  await assert.rejects(
    completePhone(store, auth.user.id, { phone: "6175550134" }),
    (err: unknown) => err instanceof IdentityConflictError && err.field === "phone",
  );
  const record = await store.findUserById(auth.user.id);
  assert.equal(record?.phoneNormalized, null, "nothing was merged or overwritten");
});

/* ------------------------- Google-only password login ------------------------- */

test("password login on a Google-only account returns the specific error — never 'wrong password'", async () => {
  const store = new MemoryIdentityStore();
  await resolveGoogleAccount(store, CLAIMS);
  await assert.rejects(
    loginDriver(store, { email: "rider@example.com", password: "anything at all" }),
    (err: unknown) =>
      err instanceof GoogleOnlyAccountError && err.code === "google_signin_required",
  );
});

test("password login: wrong password on a password account is still the generic error", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, {
    name: "Casey Driver",
    email: "casey@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  await assert.rejects(
    loginDriver(store, { email: "casey@example.com", password: "wrong password" }),
    InvalidCredentialsError,
  );
});
