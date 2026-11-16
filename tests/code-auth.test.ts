/**
 * Code-first auth tests (0013) — the owner's "make it easy, just like
 * the big brand" door: phone OPTIONAL at sign-up, sign-up by emailed
 * code, and sign-in by emailed code — one door for both crowds.
 *
 * Run: npm test. Everything runs against the in-memory store and the
 * RECORDING mailer: NO real database, NO real email, NO network. The
 * issued code is read back out of the recorded "email" — the same
 * path a customer's inbox would take.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "code-auth-test-secret";

import { PasswordMismatchError, completePhone, loginDriver, registerDriver } from "../lib/server/authService";
import {
  completeCodeSignup,
  requestEmailCode,
  verifyEmailCode,
} from "../lib/server/codeAuth";
import { PhoneRequiredError, executeDiagnosis } from "../lib/server/diagnoseService";
import { InvalidCodeError } from "../lib/server/errors";
import { RecordingMailer, type MailMessage } from "../lib/server/mailer";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { IdentityConflictError, MemoryIdentityStore } from "../lib/server/store";

function codeFrom(message: MailMessage): string {
  const match = /Your code is: (\d{6})/.exec(message.text);
  assert.ok(match, "the email carries a 6-digit code");
  return match[1];
}

function wrongCodeFor(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

async function drain<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const event of gen) out.push(event);
  return out;
}

// ---------------------------------------------------------------------
// Phone OPTIONAL at sign-up (classic door) — and the diagnosis gate
// that keeps the identity rule intact without it
// ---------------------------------------------------------------------

test("optional phone: registration without a phone succeeds; the account keys on email alone", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  const auth = await registerDriver(
    store,
    { name: "No Phone", email: "nophone@example.com", password: "correct horse battery" },
    { mailer },
  );
  assert.ok(auth.token);
  assert.equal(auth.user.phone, null);
  const record = await store.findUserByEmail("nophone@example.com");
  assert.ok(record);
  assert.equal(record.phoneNormalized, null);
  // And the same email still cannot re-register — the email key alone
  // holds the identity.
  await assert.rejects(
    registerDriver(store, {
      name: "No Phone",
      email: "nophone@example.com",
      password: "correct horse battery",
    }),
    (err: unknown) => err instanceof IdentityConflictError && err.field === "email",
  );
});

test("optional phone: a phone-less account is refused at the diagnosis gate BEFORE any consume — then succeeds once the phone lands", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const auth = await registerDriver(store, {
    name: "No Phone",
    email: "gate@example.com",
    password: "correct horse battery",
  });
  const record = await store.findUserById(auth.user.id);
  assert.ok(record);
  assert.equal(record.phoneNormalized, null);

  await assert.rejects(
    drain(
      executeDiagnosis(
        { store, provider },
        { user: record, request: { problem: "Squealing when I brake" } },
      ),
    ),
    PhoneRequiredError,
  );
  assert.equal(provider.calls.length, 0, "the AI provider is never reached");
  assert.equal(
    (await store.findUserById(auth.user.id))?.freeDiagnosesUsed,
    0,
    "no quota was consumed by the refusal",
  );

  await completePhone(store, auth.user.id, { phone: "(617) 555-0134" });
  const ready = await store.findUserById(auth.user.id);
  assert.ok(ready);
  const events = await drain(
    executeDiagnosis(
      { store, provider },
      { user: ready, request: { problem: "Squealing when I brake" } },
    ),
  );
  assert.equal(provider.calls.length, 1);
  const done = events.find((e) => e.type === "done");
  assert.ok(done && done.type === "done");
  assert.equal(done.quota.remaining, 4, "exactly one free diagnosis consumed after the phone landed");
});

// ---------------------------------------------------------------------
// Code-first sign-up — the happy path and its refusals
// ---------------------------------------------------------------------

test("code sign-up happy path: code emailed → verified → ticket → account created ALREADY VERIFIED", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();

  const answer = await requestEmailCode(store, mailer, "New@Example.com");
  assert.deepEqual(answer, { accepted: true });
  assert.equal(mailer.messages.length, 1);
  assert.equal(mailer.messages[0].to, "new@example.com");
  assert.match(mailer.messages[0].subject, /sign-up/i);
  const code = codeFrom(mailer.messages[0]);

  // At rest: ONLY the hash, in the pending table — and no user exists.
  const pending = await store.getPendingSignupCode("new@example.com");
  assert.ok(pending);
  assert.match(pending.codeHash, /^[0-9a-f]{64}$/);
  assert.notEqual(pending.codeHash, code);
  assert.equal(await store.findUserByEmail("new@example.com"), null);

  const outcome = await verifyEmailCode(store, "new@example.com", code);
  assert.equal(outcome.kind, "signup_verified");
  if (outcome.kind !== "signup_verified") return;
  assert.ok(outcome.ticket.length > 10);
  // The code is gone — single use.
  assert.equal(await store.getPendingSignupCode("new@example.com"), null);

  const auth = await completeCodeSignup(store, outcome.ticket, {
    name: "New Driver",
    password: "correct horse battery",
    confirmPassword: "correct horse battery",
  });
  assert.ok(auth.token);
  assert.equal(auth.user.email, "new@example.com");
  assert.equal(auth.user.emailVerified, true, "created already verified — the code earned it");
  assert.equal(auth.user.phone, null, "phone stayed optional through the code door too");
  assert.equal(auth.quota.remaining, 5);
  // No verification email was sent on creation — nothing left to verify.
  assert.equal(mailer.messages.length, 1);
  const record = await store.findUserByEmail("new@example.com");
  assert.ok(record?.emailVerifiedAt);
  // And the password that was set signs in the classic way.
  const login = await loginDriver(store, {
    email: "new@example.com",
    password: "correct horse battery",
  });
  assert.equal(login.user.id, auth.user.id);
});

test("code sign-up: a wrong code is refused with the one generic error; nothing is created", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await requestEmailCode(store, mailer, "wrong@example.com");
  const code = codeFrom(mailer.messages[0]);
  await assert.rejects(
    verifyEmailCode(store, "wrong@example.com", wrongCodeFor(code)),
    InvalidCodeError,
  );
  assert.equal(await store.findUserByEmail("wrong@example.com"), null);
  // One wrong try does not kill the code (5 attempts) — the right one works.
  const outcome = await verifyEmailCode(store, "wrong@example.com", code);
  assert.equal(outcome.kind, "signup_verified");
});

test("code sign-up: an expired code is refused", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await requestEmailCode(store, mailer, "expired@example.com");
  const code = codeFrom(mailer.messages[0]);
  const record = await store.getPendingSignupCode("expired@example.com");
  assert.ok(record);
  record.expiresAt = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(verifyEmailCode(store, "expired@example.com", code), InvalidCodeError);
  assert.equal(await store.getPendingSignupCode("expired@example.com"), null, "the dead code is deleted");
});

test("code sign-up: five wrong attempts kill the pending code — even the right code then fails", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await requestEmailCode(store, mailer, "attempts@example.com");
  const code = codeFrom(mailer.messages[0]);
  const wrong = wrongCodeFor(code);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(verifyEmailCode(store, "attempts@example.com", wrong), InvalidCodeError);
  }
  await assert.rejects(verifyEmailCode(store, "attempts@example.com", code), InvalidCodeError);
  assert.equal(await store.getPendingSignupCode("attempts@example.com"), null);
});

test("code sign-up completion: a mismatched confirm creates NOTHING; a phone owned by another account is a 409", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await registerDriver(store, {
    name: "Phone Owner",
    email: "owner@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  await requestEmailCode(store, mailer, "second@example.com");
  const outcome = await verifyEmailCode(store, "second@example.com", codeFrom(mailer.messages[0]));
  assert.equal(outcome.kind, "signup_verified");
  if (outcome.kind !== "signup_verified") return;

  await assert.rejects(
    completeCodeSignup(store, outcome.ticket, {
      name: "Second",
      password: "correct horse battery",
      confirmPassword: "different passphrase",
    }),
    PasswordMismatchError,
  );
  assert.equal(await store.findUserByEmail("second@example.com"), null);

  await assert.rejects(
    completeCodeSignup(store, outcome.ticket, {
      name: "Second",
      phone: "617-555-0134",
      password: "correct horse battery",
      confirmPassword: "correct horse battery",
    }),
    (err: unknown) => err instanceof IdentityConflictError && err.field === "phone",
  );
  assert.equal(await store.findUserByEmail("second@example.com"), null);

  // The same ticket still completes with clean inputs — a refused
  // attempt does not burn it.
  const auth = await completeCodeSignup(store, outcome.ticket, {
    name: "Second",
    password: "correct horse battery",
    confirmPassword: "correct horse battery",
  });
  assert.ok(auth.token);
});

test("code sign-up: a ticket cannot create a second account once the email is registered", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await requestEmailCode(store, mailer, "race@example.com");
  const outcome = await verifyEmailCode(store, "race@example.com", codeFrom(mailer.messages[0]));
  assert.equal(outcome.kind, "signup_verified");
  if (outcome.kind !== "signup_verified") return;
  // Another path registers the email first.
  await registerDriver(store, {
    name: "Classic",
    email: "race@example.com",
    password: "correct horse battery",
  });
  await assert.rejects(
    completeCodeSignup(store, outcome.ticket, {
      name: "Code",
      password: "correct horse battery",
      confirmPassword: "correct horse battery",
    }),
    (err: unknown) => err instanceof IdentityConflictError && err.field === "email",
  );
});

test("code sign-up: a forged or malformed ticket is refused with the generic code error", async () => {
  const store = new MemoryIdentityStore();
  await assert.rejects(
    completeCodeSignup(store, "not-a-ticket", {
      name: "Forged",
      password: "correct horse battery",
      confirmPassword: "correct horse battery",
    }),
    InvalidCodeError,
  );
  assert.equal(await store.findUserByEmail("forged@example.com"), null);
});

// ---------------------------------------------------------------------
// Code sign-in — existing accounts through the same door
// ---------------------------------------------------------------------

test("already-registered email is routed to code LOGIN: the code signs in the SAME account, quota untouched", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  const registered = await registerDriver(
    store,
    {
      name: "Casey Driver",
      email: "casey@example.com",
      phone: "(617) 555-0134",
      password: "correct horse battery",
    },
    { mailer },
  );
  const before = mailer.messages.length;

  const answer = await requestEmailCode(store, mailer, "  Casey@Example.COM ");
  assert.deepEqual(answer, { accepted: true });
  assert.equal(mailer.messages.length, before + 1);
  const mail = mailer.messages[before];
  assert.equal(mail.to, "casey@example.com");
  assert.match(mail.subject, /sign-in/i);
  // The code hangs off the USER row (purpose signin) — no pending code.
  assert.equal(await store.getPendingSignupCode("casey@example.com"), null);
  const live = await store.getAuthCode(registered.user.id, "signin");
  assert.ok(live);

  const outcome = await verifyEmailCode(store, "casey@example.com", codeFrom(mail));
  assert.equal(outcome.kind, "signed_in");
  if (outcome.kind !== "signed_in") return;
  assert.equal(outcome.result.user.id, registered.user.id, "the same account — never a new one");
  assert.equal(outcome.result.quota.remaining, 5, "the count is exactly where it was left");
  assert.ok(outcome.result.token);
  // Single use: the signin code is gone after the sign-in.
  assert.equal(await store.getAuthCode(registered.user.id, "signin"), null);
});

test("code sign-in stamps the email verified when it wasn't — inbox control is proof", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  const registered = await registerDriver(
    store,
    { name: "Unverified", email: "unv@example.com", password: "correct horse battery" },
    { mailer },
  );
  assert.equal(registered.user.emailVerified, false);
  await requestEmailCode(store, mailer, "unv@example.com");
  const outcome = await verifyEmailCode(
    store,
    "unv@example.com",
    codeFrom(mailer.messages[mailer.messages.length - 1]),
  );
  assert.equal(outcome.kind, "signed_in");
  if (outcome.kind !== "signed_in") return;
  assert.equal(outcome.result.user.emailVerified, true);
  assert.ok((await store.findUserById(registered.user.id))?.emailVerifiedAt);
});

test("code sign-in: a Google-only account (no password) can also sign in by code", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  const googleUser = await store.createUser({
    name: "Google Only",
    email: "gonly@example.com",
    phone: null,
    phoneNormalized: null,
    passwordHash: null,
    googleSub: "google-sub-xyz",
    authMethod: "google",
  });
  await requestEmailCode(store, mailer, "gonly@example.com");
  const outcome = await verifyEmailCode(store, "gonly@example.com", codeFrom(mailer.messages[0]));
  assert.equal(outcome.kind, "signed_in");
  if (outcome.kind !== "signed_in") return;
  assert.equal(outcome.result.user.id, googleUser.id);
});

// ---------------------------------------------------------------------
// Anti-enumeration + resend cooldown on the request
// ---------------------------------------------------------------------

test("anti-enumeration: the code request answers BYTE-IDENTICALLY for known, unknown, and unusable emails", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await registerDriver(store, {
    name: "Known",
    email: "known@example.com",
    password: "correct horse battery",
  });
  const known = await requestEmailCode(store, mailer, "known@example.com");
  const unknown = await requestEmailCode(store, mailer, "stranger@example.com");
  const unusable = await requestEmailCode(store, mailer, "not-an-email");
  const nonString = await requestEmailCode(store, mailer, 42);
  assert.deepEqual(known, { accepted: true });
  assert.equal(JSON.stringify(unknown), JSON.stringify(known), "unknown answers byte-identically");
  assert.equal(JSON.stringify(unusable), JSON.stringify(known), "unusable answers byte-identically");
  assert.equal(JSON.stringify(nonString), JSON.stringify(known), "non-string answers byte-identically");
  // Verification failures never reveal which side of the door an
  // email sits on either: same error class, same message.
  const errKnown = await verifyEmailCode(store, "known@example.com", "123456").catch((e) => e);
  const errUnknown = await verifyEmailCode(store, "stranger@example.com", "654321").catch((e) => e);
  assert.ok(errKnown instanceof InvalidCodeError);
  assert.ok(errUnknown instanceof InvalidCodeError);
  assert.equal(errKnown.message, errUnknown.message);
  assert.equal(errKnown.code, errUnknown.code);
});

test("resend cooldown: a second request inside 60 seconds mails nothing new; after it, the fresh code replaces the old", async () => {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  await requestEmailCode(store, mailer, "cool@example.com");
  assert.equal(mailer.messages.length, 1);
  const firstCode = codeFrom(mailer.messages[0]);

  const again = await requestEmailCode(store, mailer, "cool@example.com");
  assert.deepEqual(again, { accepted: true });
  assert.equal(mailer.messages.length, 1, "no second email inside the cooldown");

  const record = await store.getPendingSignupCode("cool@example.com");
  assert.ok(record);
  record.createdAt = new Date(Date.now() - 61_000).toISOString();

  await requestEmailCode(store, mailer, "cool@example.com");
  assert.equal(mailer.messages.length, 2);
  const secondCode = codeFrom(mailer.messages[1]);
  if (secondCode !== firstCode) {
    await assert.rejects(verifyEmailCode(store, "cool@example.com", firstCode), InvalidCodeError);
  }
  const outcome = await verifyEmailCode(store, "cool@example.com", secondCode);
  assert.equal(outcome.kind, "signup_verified");
});
