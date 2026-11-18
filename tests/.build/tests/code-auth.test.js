"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "code-auth-test-secret";
const authService_1 = require("../lib/server/authService");
const codeAuth_1 = require("../lib/server/codeAuth");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const errors_1 = require("../lib/server/errors");
const mailer_1 = require("../lib/server/mailer");
const provider_1 = require("../lib/server/provider");
const store_1 = require("../lib/server/store");
function codeFrom(message) {
    const match = /Your code is: (\d{6})/.exec(message.text);
    strict_1.default.ok(match, "the email carries a 6-digit code");
    return match[1];
}
function wrongCodeFor(code) {
    return code === "000000" ? "111111" : "000000";
}
async function drain(gen) {
    const out = [];
    for await (const event of gen)
        out.push(event);
    return out;
}
// ---------------------------------------------------------------------
// Phone OPTIONAL at sign-up (classic door) — and, since the owner's
// 2026-11-16 rules, optional for diagnoses too: the account alone
// is the diagnosis requirement
// ---------------------------------------------------------------------
(0, node_test_1.test)("optional phone: registration without a phone succeeds; the account keys on email alone", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const auth = await (0, authService_1.registerDriver)(store, { name: "No Phone", email: "nophone@example.com", password: "correct horse battery" }, { mailer });
    strict_1.default.ok(auth.token);
    strict_1.default.equal(auth.user.phone, null);
    const record = await store.findUserByEmail("nophone@example.com");
    strict_1.default.ok(record);
    strict_1.default.equal(record.phoneNormalized, null);
    // And the same email still cannot re-register — the email key alone
    // holds the identity.
    await strict_1.default.rejects((0, authService_1.registerDriver)(store, {
        name: "No Phone",
        email: "nophone@example.com",
        password: "correct horse battery",
    }), (err) => err instanceof store_1.IdentityConflictError && err.field === "email");
});
(0, node_test_1.test)("optional phone: a phone-less account diagnoses on the account alone — no refusal, exactly one consume", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    const auth = await (0, authService_1.registerDriver)(store, {
        name: "No Phone",
        email: "gate@example.com",
        password: "correct horse battery",
    });
    const record = await store.findUserById(auth.user.id);
    strict_1.default.ok(record);
    strict_1.default.equal(record.phoneNormalized, null);
    const events = await drain((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: record, request: { problem: "Squealing when I brake" } }));
    strict_1.default.equal(provider.calls.length, 1, "the diagnosis runs with NO phone on file");
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done && done.type === "done");
    strict_1.default.equal(done.quota.remaining, 4, "exactly one free diagnosis consumed, keyed on the account");
    // The number can still land later through the same save the
    // dashboard card uses — and the count does not move.
    await (0, authService_1.completePhone)(store, auth.user.id, { phone: "(617) 555-0134" });
    strict_1.default.equal((await store.findUserById(auth.user.id))?.freeDiagnosesUsed, 1, "the count is untouched by the phone landing");
});
// ---------------------------------------------------------------------
// Code-first sign-up — the happy path and its refusals
// ---------------------------------------------------------------------
(0, node_test_1.test)("code sign-up happy path: code emailed → verified → ticket → account created ALREADY VERIFIED", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const answer = await (0, codeAuth_1.requestEmailCode)(store, mailer, "New@Example.com");
    strict_1.default.deepEqual(answer, { accepted: true });
    strict_1.default.equal(mailer.messages.length, 1);
    strict_1.default.equal(mailer.messages[0].to, "new@example.com");
    strict_1.default.match(mailer.messages[0].subject, /sign-up/i);
    const code = codeFrom(mailer.messages[0]);
    // At rest: ONLY the hash, in the pending table — and no user exists.
    const pending = await store.getPendingSignupCode("new@example.com");
    strict_1.default.ok(pending);
    strict_1.default.match(pending.codeHash, /^[0-9a-f]{64}$/);
    strict_1.default.notEqual(pending.codeHash, code);
    strict_1.default.equal(await store.findUserByEmail("new@example.com"), null);
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "new@example.com", code);
    strict_1.default.equal(outcome.kind, "signup_verified");
    if (outcome.kind !== "signup_verified")
        return;
    strict_1.default.ok(outcome.ticket.length > 10);
    // The code is gone — single use.
    strict_1.default.equal(await store.getPendingSignupCode("new@example.com"), null);
    const auth = await (0, codeAuth_1.completeCodeSignup)(store, outcome.ticket, {
        name: "New Driver",
        password: "correct horse battery",
        confirmPassword: "correct horse battery",
    });
    strict_1.default.ok(auth.token);
    strict_1.default.equal(auth.user.email, "new@example.com");
    strict_1.default.equal(auth.user.emailVerified, true, "created already verified — the code earned it");
    strict_1.default.equal(auth.user.phone, null, "phone stayed optional through the code door too");
    strict_1.default.equal(auth.quota.remaining, 5);
    // No verification email was sent on creation — nothing left to verify.
    strict_1.default.equal(mailer.messages.length, 1);
    const record = await store.findUserByEmail("new@example.com");
    strict_1.default.ok(record?.emailVerifiedAt);
    // And the password that was set signs in the classic way.
    const login = await (0, authService_1.loginDriver)(store, {
        email: "new@example.com",
        password: "correct horse battery",
    });
    strict_1.default.equal(login.user.id, auth.user.id);
});
(0, node_test_1.test)("code sign-up: a wrong code is refused with the one generic error; nothing is created", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "wrong@example.com");
    const code = codeFrom(mailer.messages[0]);
    await strict_1.default.rejects((0, codeAuth_1.verifyEmailCode)(store, "wrong@example.com", wrongCodeFor(code)), errors_1.InvalidCodeError);
    strict_1.default.equal(await store.findUserByEmail("wrong@example.com"), null);
    // One wrong try does not kill the code (5 attempts) — the right one works.
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "wrong@example.com", code);
    strict_1.default.equal(outcome.kind, "signup_verified");
});
(0, node_test_1.test)("code sign-up: an expired code is refused", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "expired@example.com");
    const code = codeFrom(mailer.messages[0]);
    const record = await store.getPendingSignupCode("expired@example.com");
    strict_1.default.ok(record);
    record.expiresAt = new Date(Date.now() - 1000).toISOString();
    await strict_1.default.rejects((0, codeAuth_1.verifyEmailCode)(store, "expired@example.com", code), errors_1.InvalidCodeError);
    strict_1.default.equal(await store.getPendingSignupCode("expired@example.com"), null, "the dead code is deleted");
});
(0, node_test_1.test)("code sign-up: five wrong attempts kill the pending code — even the right code then fails", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "attempts@example.com");
    const code = codeFrom(mailer.messages[0]);
    const wrong = wrongCodeFor(code);
    for (let i = 0; i < 5; i++) {
        await strict_1.default.rejects((0, codeAuth_1.verifyEmailCode)(store, "attempts@example.com", wrong), errors_1.InvalidCodeError);
    }
    await strict_1.default.rejects((0, codeAuth_1.verifyEmailCode)(store, "attempts@example.com", code), errors_1.InvalidCodeError);
    strict_1.default.equal(await store.getPendingSignupCode("attempts@example.com"), null);
});
(0, node_test_1.test)("code sign-up completion: a mismatched confirm creates NOTHING; a phone owned by another account is a 409", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, authService_1.registerDriver)(store, {
        name: "Phone Owner",
        email: "owner@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "second@example.com");
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "second@example.com", codeFrom(mailer.messages[0]));
    strict_1.default.equal(outcome.kind, "signup_verified");
    if (outcome.kind !== "signup_verified")
        return;
    await strict_1.default.rejects((0, codeAuth_1.completeCodeSignup)(store, outcome.ticket, {
        name: "Second",
        password: "correct horse battery",
        confirmPassword: "different passphrase",
    }), authService_1.PasswordMismatchError);
    strict_1.default.equal(await store.findUserByEmail("second@example.com"), null);
    await strict_1.default.rejects((0, codeAuth_1.completeCodeSignup)(store, outcome.ticket, {
        name: "Second",
        phone: "617-555-0134",
        password: "correct horse battery",
        confirmPassword: "correct horse battery",
    }), (err) => err instanceof store_1.IdentityConflictError && err.field === "phone");
    strict_1.default.equal(await store.findUserByEmail("second@example.com"), null);
    // The same ticket still completes with clean inputs — a refused
    // attempt does not burn it.
    const auth = await (0, codeAuth_1.completeCodeSignup)(store, outcome.ticket, {
        name: "Second",
        password: "correct horse battery",
        confirmPassword: "correct horse battery",
    });
    strict_1.default.ok(auth.token);
});
(0, node_test_1.test)("code sign-up: a ticket cannot create a second account once the email is registered", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "race@example.com");
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "race@example.com", codeFrom(mailer.messages[0]));
    strict_1.default.equal(outcome.kind, "signup_verified");
    if (outcome.kind !== "signup_verified")
        return;
    // Another path registers the email first.
    await (0, authService_1.registerDriver)(store, {
        name: "Classic",
        email: "race@example.com",
        password: "correct horse battery",
    });
    await strict_1.default.rejects((0, codeAuth_1.completeCodeSignup)(store, outcome.ticket, {
        name: "Code",
        password: "correct horse battery",
        confirmPassword: "correct horse battery",
    }), (err) => err instanceof store_1.IdentityConflictError && err.field === "email");
});
(0, node_test_1.test)("code sign-up: a forged or malformed ticket is refused with the generic code error", async () => {
    const store = new store_1.MemoryIdentityStore();
    await strict_1.default.rejects((0, codeAuth_1.completeCodeSignup)(store, "not-a-ticket", {
        name: "Forged",
        password: "correct horse battery",
        confirmPassword: "correct horse battery",
    }), errors_1.InvalidCodeError);
    strict_1.default.equal(await store.findUserByEmail("forged@example.com"), null);
});
// ---------------------------------------------------------------------
// Code sign-in — existing accounts through the same door
// ---------------------------------------------------------------------
(0, node_test_1.test)("already-registered email is routed to code LOGIN: the code signs in the SAME account, quota untouched", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const registered = await (0, authService_1.registerDriver)(store, {
        name: "Casey Driver",
        email: "casey@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    }, { mailer });
    const before = mailer.messages.length;
    const answer = await (0, codeAuth_1.requestEmailCode)(store, mailer, "  Casey@Example.COM ");
    strict_1.default.deepEqual(answer, { accepted: true });
    strict_1.default.equal(mailer.messages.length, before + 1);
    const mail = mailer.messages[before];
    strict_1.default.equal(mail.to, "casey@example.com");
    strict_1.default.match(mail.subject, /sign-in/i);
    // The code hangs off the USER row (purpose signin) — no pending code.
    strict_1.default.equal(await store.getPendingSignupCode("casey@example.com"), null);
    const live = await store.getAuthCode(registered.user.id, "signin");
    strict_1.default.ok(live);
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "casey@example.com", codeFrom(mail));
    strict_1.default.equal(outcome.kind, "signed_in");
    if (outcome.kind !== "signed_in")
        return;
    strict_1.default.equal(outcome.result.user.id, registered.user.id, "the same account — never a new one");
    strict_1.default.equal(outcome.result.quota.remaining, 5, "the count is exactly where it was left");
    strict_1.default.ok(outcome.result.token);
    // Single use: the signin code is gone after the sign-in.
    strict_1.default.equal(await store.getAuthCode(registered.user.id, "signin"), null);
});
(0, node_test_1.test)("code sign-in stamps the email verified when it wasn't — inbox control is proof", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const registered = await (0, authService_1.registerDriver)(store, { name: "Unverified", email: "unv@example.com", password: "correct horse battery" }, { mailer });
    strict_1.default.equal(registered.user.emailVerified, false);
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "unv@example.com");
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "unv@example.com", codeFrom(mailer.messages[mailer.messages.length - 1]));
    strict_1.default.equal(outcome.kind, "signed_in");
    if (outcome.kind !== "signed_in")
        return;
    strict_1.default.equal(outcome.result.user.emailVerified, true);
    strict_1.default.ok((await store.findUserById(registered.user.id))?.emailVerifiedAt);
});
(0, node_test_1.test)("code sign-in: a Google-only account (no password) can also sign in by code", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const googleUser = await store.createUser({
        name: "Google Only",
        email: "gonly@example.com",
        phone: null,
        phoneNormalized: null,
        passwordHash: null,
        googleSub: "google-sub-xyz",
        authMethod: "google",
    });
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "gonly@example.com");
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "gonly@example.com", codeFrom(mailer.messages[0]));
    strict_1.default.equal(outcome.kind, "signed_in");
    if (outcome.kind !== "signed_in")
        return;
    strict_1.default.equal(outcome.result.user.id, googleUser.id);
});
// ---------------------------------------------------------------------
// Anti-enumeration + resend cooldown on the request
// ---------------------------------------------------------------------
(0, node_test_1.test)("anti-enumeration: the code request answers BYTE-IDENTICALLY for known, unknown, and unusable emails", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, authService_1.registerDriver)(store, {
        name: "Known",
        email: "known@example.com",
        password: "correct horse battery",
    });
    const known = await (0, codeAuth_1.requestEmailCode)(store, mailer, "known@example.com");
    const unknown = await (0, codeAuth_1.requestEmailCode)(store, mailer, "stranger@example.com");
    const unusable = await (0, codeAuth_1.requestEmailCode)(store, mailer, "not-an-email");
    const nonString = await (0, codeAuth_1.requestEmailCode)(store, mailer, 42);
    strict_1.default.deepEqual(known, { accepted: true });
    strict_1.default.equal(JSON.stringify(unknown), JSON.stringify(known), "unknown answers byte-identically");
    strict_1.default.equal(JSON.stringify(unusable), JSON.stringify(known), "unusable answers byte-identically");
    strict_1.default.equal(JSON.stringify(nonString), JSON.stringify(known), "non-string answers byte-identically");
    // Verification failures never reveal which side of the door an
    // email sits on either: same error class, same message.
    const errKnown = await (0, codeAuth_1.verifyEmailCode)(store, "known@example.com", "123456").catch((e) => e);
    const errUnknown = await (0, codeAuth_1.verifyEmailCode)(store, "stranger@example.com", "654321").catch((e) => e);
    strict_1.default.ok(errKnown instanceof errors_1.InvalidCodeError);
    strict_1.default.ok(errUnknown instanceof errors_1.InvalidCodeError);
    strict_1.default.equal(errKnown.message, errUnknown.message);
    strict_1.default.equal(errKnown.code, errUnknown.code);
});
(0, node_test_1.test)("resend cooldown: a second request inside 60 seconds mails nothing new; after it, the fresh code replaces the old", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "cool@example.com");
    strict_1.default.equal(mailer.messages.length, 1);
    const firstCode = codeFrom(mailer.messages[0]);
    const again = await (0, codeAuth_1.requestEmailCode)(store, mailer, "cool@example.com");
    strict_1.default.deepEqual(again, { accepted: true });
    strict_1.default.equal(mailer.messages.length, 1, "no second email inside the cooldown");
    const record = await store.getPendingSignupCode("cool@example.com");
    strict_1.default.ok(record);
    record.createdAt = new Date(Date.now() - 61_000).toISOString();
    await (0, codeAuth_1.requestEmailCode)(store, mailer, "cool@example.com");
    strict_1.default.equal(mailer.messages.length, 2);
    const secondCode = codeFrom(mailer.messages[1]);
    if (secondCode !== firstCode) {
        await strict_1.default.rejects((0, codeAuth_1.verifyEmailCode)(store, "cool@example.com", firstCode), errors_1.InvalidCodeError);
    }
    const outcome = await (0, codeAuth_1.verifyEmailCode)(store, "cool@example.com", secondCode);
    strict_1.default.equal(outcome.kind, "signup_verified");
});
