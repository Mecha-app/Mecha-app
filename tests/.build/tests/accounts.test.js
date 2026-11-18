"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Accounts-completeness tests (0011/0012) — email verification,
 * password reset by email OR phone identifier, and the owner's
 * add-a-vehicle field spec.
 *
 * Run: npm test. Everything runs against the in-memory stores and the
 * RECORDING mailer: NO real database, NO real email, NO network. The
 * issued code is read back out of the recorded "email" — the same
 * path a customer's inbox would take.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "accounts-test-secret";
const accountCodes_1 = require("../lib/server/accountCodes");
const appStore_1 = require("../lib/server/appStore");
const authService_1 = require("../lib/server/authService");
const errors_1 = require("../lib/server/errors");
const mailer_1 = require("../lib/server/mailer");
const store_1 = require("../lib/server/store");
const vehicleService_1 = require("../lib/server/vehicleService");
const DRIVER = {
    name: "Casey Driver",
    email: "casey@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
};
function codeFrom(message) {
    const match = /Your code is: (\d{6})/.exec(message.text);
    strict_1.default.ok(match, "the email carries a 6-digit code");
    return match[1];
}
function wrongCodeFor(code) {
    return code === "000000" ? "111111" : "000000";
}
async function freshAccount() {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const auth = await (0, authService_1.registerDriver)(store, DRIVER, { mailer });
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    return { store, mailer, auth, user };
}
// ---------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------
(0, node_test_1.test)("register issues a verification code by email; the account starts unverified", async () => {
    const { store, mailer, auth, user } = await freshAccount();
    strict_1.default.equal(auth.verificationDelivery, "sent");
    strict_1.default.equal(auth.user.emailVerified, false);
    strict_1.default.equal(user.emailVerifiedAt, null);
    strict_1.default.equal(mailer.messages.length, 1);
    strict_1.default.equal(mailer.messages[0].to, DRIVER.email);
    strict_1.default.match(mailer.messages[0].subject, /verification/i);
    // Hashed at rest: the stored value is a SHA-256 hex, never the code.
    const code = codeFrom(mailer.messages[0]);
    const stored = await store.getAuthCode(user.id, "verify_email");
    strict_1.default.ok(stored);
    strict_1.default.match(stored.codeHash, /^[0-9a-f]{64}$/);
    strict_1.default.notEqual(stored.codeHash, code);
});
(0, node_test_1.test)("verification lifecycle: wrong refused → correct verifies → replay refused → re-verify refused", async () => {
    const { store, mailer, user } = await freshAccount();
    const code = codeFrom(mailer.messages[0]);
    await strict_1.default.rejects((0, accountCodes_1.verifyEmailWithCode)(store, user.id, wrongCodeFor(code)), errors_1.InvalidCodeError);
    strict_1.default.equal((await store.findUserById(user.id))?.emailVerifiedAt, null);
    const verified = await (0, accountCodes_1.verifyEmailWithCode)(store, user.id, code);
    strict_1.default.ok(verified.emailVerifiedAt);
    strict_1.default.equal((0, authService_1.publicUser)(verified).emailVerified, true);
    // The code is gone — single use (a replay has nothing to match, and
    // the verified account short-circuits with its own truthful state).
    strict_1.default.equal(await store.getAuthCode(user.id, "verify_email"), null);
    await strict_1.default.rejects((0, accountCodes_1.verifyEmailWithCode)(store, user.id, code), errors_1.AlreadyVerifiedError);
    await strict_1.default.rejects((0, accountCodes_1.sendVerificationCode)(store, mailer, verified), errors_1.AlreadyVerifiedError);
});
(0, node_test_1.test)("verification: an expired code is refused", async () => {
    const { store, mailer, user } = await freshAccount();
    const code = codeFrom(mailer.messages[0]);
    const record = await store.getAuthCode(user.id, "verify_email");
    strict_1.default.ok(record);
    // Age the code past its 15 minutes (test-only tamper of the record).
    record.expiresAt = new Date(Date.now() - 1000).toISOString();
    await strict_1.default.rejects((0, accountCodes_1.verifyEmailWithCode)(store, user.id, code), errors_1.InvalidCodeError);
    strict_1.default.equal((await store.findUserById(user.id))?.emailVerifiedAt, null);
});
(0, node_test_1.test)("verification: five wrong attempts kill the code — even the right code then fails", async () => {
    const { store, mailer, user } = await freshAccount();
    const code = codeFrom(mailer.messages[0]);
    const wrong = wrongCodeFor(code);
    for (let i = 0; i < 5; i++) {
        await strict_1.default.rejects((0, accountCodes_1.verifyEmailWithCode)(store, user.id, wrong), errors_1.InvalidCodeError);
    }
    await strict_1.default.rejects((0, accountCodes_1.verifyEmailWithCode)(store, user.id, code), errors_1.InvalidCodeError);
    strict_1.default.equal(await store.getAuthCode(user.id, "verify_email"), null);
});
(0, node_test_1.test)("resend rate limit: a fresh code inside the cooldown is refused; after it, resend kills the old code", async () => {
    const { store, mailer, user } = await freshAccount();
    const firstCode = codeFrom(mailer.messages[0]);
    await strict_1.default.rejects((0, accountCodes_1.sendVerificationCode)(store, mailer, user), errors_1.ResendTooSoonError);
    strict_1.default.equal(mailer.messages.length, 1, "no second email during the cooldown");
    const record = await store.getAuthCode(user.id, "verify_email");
    strict_1.default.ok(record);
    record.createdAt = new Date(Date.now() - 61_000).toISOString();
    const resent = await (0, accountCodes_1.sendVerificationCode)(store, mailer, user);
    strict_1.default.equal(resent.delivery, "sent");
    strict_1.default.equal(mailer.messages.length, 2);
    const secondCode = codeFrom(mailer.messages[1]);
    // The replaced code is dead; the fresh one verifies.
    if (secondCode !== firstCode) {
        await strict_1.default.rejects((0, accountCodes_1.verifyEmailWithCode)(store, user.id, firstCode), errors_1.InvalidCodeError);
    }
    const verified = await (0, accountCodes_1.verifyEmailWithCode)(store, user.id, secondCode);
    strict_1.default.ok(verified.emailVerifiedAt);
});
// ---------------------------------------------------------------------
// Password reset — email OR phone identifier, code to the email on file
// ---------------------------------------------------------------------
(0, node_test_1.test)("reset by EMAIL identifier: code emailed, password replaced, old password dead", async () => {
    const { store, mailer, user } = await freshAccount();
    const before = mailer.messages.length;
    const answer = await (0, accountCodes_1.requestPasswordReset)(store, mailer, "  Casey@Example.COM ");
    strict_1.default.deepEqual(answer, { accepted: true });
    strict_1.default.equal(mailer.messages.length, before + 1);
    const mail = mailer.messages[before];
    strict_1.default.equal(mail.to, user.email);
    strict_1.default.match(mail.subject, /reset/i);
    const code = codeFrom(mail);
    await strict_1.default.rejects((0, accountCodes_1.resetPassword)(store, DRIVER.email, wrongCodeFor(code), "brand new password"), errors_1.InvalidCodeError);
    const updated = await (0, accountCodes_1.resetPassword)(store, DRIVER.email, code, "brand new password");
    strict_1.default.equal(updated.id, user.id);
    const relogin = await (0, authService_1.loginDriver)(store, { email: DRIVER.email, password: "brand new password" });
    strict_1.default.equal(relogin.user.id, user.id);
    await strict_1.default.rejects((0, authService_1.loginDriver)(store, { email: DRIVER.email, password: DRIVER.password }), /incorrect/i);
});
(0, node_test_1.test)("reset by PHONE identifier (any formatting): same account, code still emailed to the address on file", async () => {
    const { store, mailer, user } = await freshAccount();
    const before = mailer.messages.length;
    const answer = await (0, accountCodes_1.requestPasswordReset)(store, mailer, "617-555-0134");
    strict_1.default.deepEqual(answer, { accepted: true });
    strict_1.default.equal(mailer.messages.length, before + 1);
    const mail = mailer.messages[before];
    // Delivered to the EMAIL on file — there is no SMS path.
    strict_1.default.equal(mail.to, DRIVER.email);
    const updated = await (0, accountCodes_1.resetPassword)(store, "+1 (617) 555-0134", codeFrom(mail), "second new password");
    strict_1.default.equal(updated.id, user.id);
    const relogin = await (0, authService_1.loginDriver)(store, { email: DRIVER.email, password: "second new password" });
    strict_1.default.equal(relogin.user.id, user.id);
});
(0, node_test_1.test)("reset anti-enumeration: unknown identifiers answer identically and send nothing", async () => {
    const { store, mailer } = await freshAccount();
    const before = mailer.messages.length;
    const byEmail = await (0, accountCodes_1.requestPasswordReset)(store, mailer, "nobody@example.com");
    const byPhone = await (0, accountCodes_1.requestPasswordReset)(store, mailer, "(212) 555-9999");
    const garbage = await (0, accountCodes_1.requestPasswordReset)(store, mailer, "not-an-identifier");
    strict_1.default.deepEqual(byEmail, { accepted: true });
    strict_1.default.deepEqual(byPhone, byEmail);
    strict_1.default.deepEqual(garbage, byEmail);
    strict_1.default.equal(mailer.messages.length, before, "no mail for unknown identifiers");
    // A reset attempt against an unknown identifier fails with the SAME
    // generic error a wrong code produces — no existence oracle.
    await strict_1.default.rejects((0, accountCodes_1.resetPassword)(store, "nobody@example.com", "123456", "whatever password"), errors_1.InvalidCodeError);
});
(0, node_test_1.test)("reset code is single-use: a second reset with the same code is refused", async () => {
    const { store, mailer } = await freshAccount();
    await (0, accountCodes_1.requestPasswordReset)(store, mailer, DRIVER.email);
    const code = codeFrom(mailer.messages[mailer.messages.length - 1]);
    await (0, accountCodes_1.resetPassword)(store, DRIVER.email, code, "one time password");
    await strict_1.default.rejects((0, accountCodes_1.resetPassword)(store, DRIVER.email, code, "replay password"), errors_1.InvalidCodeError);
    // The first (successful) password is still the live one.
    const relogin = await (0, authService_1.loginDriver)(store, { email: DRIVER.email, password: "one time password" });
    strict_1.default.ok(relogin.token);
});
// ---------------------------------------------------------------------
// Add-a-vehicle — the owner's field spec
// ---------------------------------------------------------------------
const VEHICLE = {
    year: 2019,
    make: "Honda",
    model: "Accord",
    engine: "1.5L 4-cylinder",
    mileage: 62_000,
};
(0, node_test_1.test)("vehicle spec: missing mileage is refused; missing engine is refused", async () => {
    const store = new appStore_1.MemoryAppStore();
    const { mileage: _m, ...noMileage } = VEHICLE;
    await strict_1.default.rejects((0, vehicleService_1.createVehicle)(store, "user-a", noMileage), authService_1.ValidationError);
    const { engine: _e, ...noEngine } = VEHICLE;
    await strict_1.default.rejects((0, vehicleService_1.createVehicle)(store, "user-a", noEngine), authService_1.ValidationError);
    await strict_1.default.rejects((0, vehicleService_1.createVehicle)(store, "user-a", { ...VEHICLE, engine: "  " }), authService_1.ValidationError);
    await strict_1.default.rejects((0, vehicleService_1.createVehicle)(store, "user-a", { ...VEHICLE, mileage: "" }), authService_1.ValidationError);
});
(0, node_test_1.test)("vehicle spec: the required five alone are accepted; optional fields default to null", async () => {
    const store = new appStore_1.MemoryAppStore();
    const vehicle = await (0, vehicleService_1.createVehicle)(store, "user-a", VEHICLE);
    strict_1.default.equal(vehicle.engine, "1.5L 4-cylinder");
    strict_1.default.equal(vehicle.mileage, 62_000);
    strict_1.default.equal(vehicle.trim, null);
    strict_1.default.equal(vehicle.vin, null);
    strict_1.default.equal(vehicle.color, null);
    strict_1.default.equal(vehicle.licensePlate, null);
});
(0, node_test_1.test)("vehicle spec: optional fields are stored (plate uppercased); engine patch validates", async () => {
    const store = new appStore_1.MemoryAppStore();
    const vehicle = await (0, vehicleService_1.createVehicle)(store, "user-a", {
        ...VEHICLE,
        trim: "EX",
        vin: "1HGCV1F34KA000000",
        color: "Silver",
        licensePlate: "abc 123",
    });
    strict_1.default.equal(vehicle.trim, "EX");
    strict_1.default.equal(vehicle.vin, "1HGCV1F34KA000000");
    strict_1.default.equal(vehicle.color, "Silver");
    strict_1.default.equal(vehicle.licensePlate, "ABC 123");
    const patched = await (0, vehicleService_1.updateVehicle)(store, "user-a", vehicle.id, { engine: "2.0L 4-cylinder turbo" });
    strict_1.default.equal(patched.engine, "2.0L 4-cylinder turbo");
    await strict_1.default.rejects((0, vehicleService_1.updateVehicle)(store, "user-a", vehicle.id, { engine: "" }), authService_1.ValidationError);
});
// ---------------------------------------------------------------------
// Password verified twice (owner's rule, 2026-11-03) — the register
// form collects a confirmation and blocks a mismatch in the browser;
// the service enforces the same match for any caller that sends one.
// ---------------------------------------------------------------------
(0, node_test_1.test)("register with a matching confirmPassword registers exactly as before", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    const auth = await (0, authService_1.registerDriver)(store, { ...DRIVER, confirmPassword: DRIVER.password }, { mailer });
    strict_1.default.ok(auth.token);
    strict_1.default.equal(auth.user.email, DRIVER.email);
    strict_1.default.equal(auth.verificationDelivery, "sent");
    strict_1.default.equal(mailer.messages.length, 1);
    // And the password that was confirmed is the one that signs in.
    const login = await (0, authService_1.loginDriver)(store, { email: DRIVER.email, password: DRIVER.password });
    strict_1.default.equal(login.user.email, DRIVER.email);
});
(0, node_test_1.test)("register with a mismatched confirmPassword is refused and creates NOTHING", async () => {
    const store = new store_1.MemoryIdentityStore();
    const mailer = new mailer_1.RecordingMailer();
    await strict_1.default.rejects((0, authService_1.registerDriver)(store, { ...DRIVER, confirmPassword: "different-passphrase" }, { mailer }), (err) => {
        strict_1.default.ok(err instanceof authService_1.PasswordMismatchError);
        strict_1.default.equal(err.code, "password_mismatch");
        return true;
    });
    // No account, no verification email — the refusal is total.
    strict_1.default.equal(await store.findUserByEmail(DRIVER.email), null);
    strict_1.default.equal(mailer.messages.length, 0);
});
(0, node_test_1.test)("register with a non-string confirmPassword is refused as a mismatch", async () => {
    const store = new store_1.MemoryIdentityStore();
    await strict_1.default.rejects((0, authService_1.registerDriver)(store, { ...DRIVER, confirmPassword: 12345678 }), authService_1.PasswordMismatchError);
    strict_1.default.equal(await store.findUserByEmail(DRIVER.email), null);
});
(0, node_test_1.test)("register without confirmPassword still works (older API callers)", async () => {
    const store = new store_1.MemoryIdentityStore();
    const auth = await (0, authService_1.registerDriver)(store, DRIVER);
    strict_1.default.ok(auth.token);
    strict_1.default.ok(await store.findUserByEmail(DRIVER.email));
});
