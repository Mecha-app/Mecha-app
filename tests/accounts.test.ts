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
import { test } from "node:test";
import assert from "node:assert/strict";

// Cheap bcrypt + deterministic env for the suite (read at call time).
process.env.MECHA_BCRYPT_COST = "4";
process.env["JWT_" + "SECRET"] = "accounts-test-secret";

import {
  requestPasswordReset,
  resetPassword,
  sendVerificationCode,
  verifyEmailWithCode,
} from "../lib/server/accountCodes";
import { MemoryAppStore } from "../lib/server/appStore";
import {
  ValidationError,
  loginDriver,
  publicUser,
  registerDriver,
} from "../lib/server/authService";
import {
  AlreadyVerifiedError,
  InvalidCodeError,
  ResendTooSoonError,
} from "../lib/server/errors";
import { RecordingMailer, type MailMessage } from "../lib/server/mailer";
import { MemoryIdentityStore } from "../lib/server/store";
import { createVehicle, updateVehicle } from "../lib/server/vehicleService";

const DRIVER = {
  name: "Casey Driver",
  email: "casey@example.com",
  phone: "(617) 555-0134",
  password: "correct horse battery",
};

function codeFrom(message: MailMessage): string {
  const match = /Your code is: (\d{6})/.exec(message.text);
  assert.ok(match, "the email carries a 6-digit code");
  return match[1];
}

function wrongCodeFor(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

async function freshAccount() {
  const store = new MemoryIdentityStore();
  const mailer = new RecordingMailer();
  const auth = await registerDriver(store, DRIVER, { mailer });
  const user = await store.findUserByEmail(DRIVER.email);
  assert.ok(user);
  return { store, mailer, auth, user };
}

// ---------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------

test("register issues a verification code by email; the account starts unverified", async () => {
  const { store, mailer, auth, user } = await freshAccount();
  assert.equal(auth.verificationDelivery, "sent");
  assert.equal(auth.user.emailVerified, false);
  assert.equal(user.emailVerifiedAt, null);
  assert.equal(mailer.messages.length, 1);
  assert.equal(mailer.messages[0].to, DRIVER.email);
  assert.match(mailer.messages[0].subject, /verification/i);
  // Hashed at rest: the stored value is a SHA-256 hex, never the code.
  const code = codeFrom(mailer.messages[0]);
  const stored = await store.getAuthCode(user.id, "verify_email");
  assert.ok(stored);
  assert.match(stored.codeHash, /^[0-9a-f]{64}$/);
  assert.notEqual(stored.codeHash, code);
});

test("verification lifecycle: wrong refused → correct verifies → replay refused → re-verify refused", async () => {
  const { store, mailer, user } = await freshAccount();
  const code = codeFrom(mailer.messages[0]);

  await assert.rejects(verifyEmailWithCode(store, user.id, wrongCodeFor(code)), InvalidCodeError);
  assert.equal((await store.findUserById(user.id))?.emailVerifiedAt, null);

  const verified = await verifyEmailWithCode(store, user.id, code);
  assert.ok(verified.emailVerifiedAt);
  assert.equal(publicUser(verified).emailVerified, true);
  // The code is gone — single use (a replay has nothing to match, and
  // the verified account short-circuits with its own truthful state).
  assert.equal(await store.getAuthCode(user.id, "verify_email"), null);

  await assert.rejects(verifyEmailWithCode(store, user.id, code), AlreadyVerifiedError);
  await assert.rejects(sendVerificationCode(store, mailer, verified), AlreadyVerifiedError);
});

test("verification: an expired code is refused", async () => {
  const { store, mailer, user } = await freshAccount();
  const code = codeFrom(mailer.messages[0]);
  const record = await store.getAuthCode(user.id, "verify_email");
  assert.ok(record);
  // Age the code past its 15 minutes (test-only tamper of the record).
  record.expiresAt = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(verifyEmailWithCode(store, user.id, code), InvalidCodeError);
  assert.equal((await store.findUserById(user.id))?.emailVerifiedAt, null);
});

test("verification: five wrong attempts kill the code — even the right code then fails", async () => {
  const { store, mailer, user } = await freshAccount();
  const code = codeFrom(mailer.messages[0]);
  const wrong = wrongCodeFor(code);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(verifyEmailWithCode(store, user.id, wrong), InvalidCodeError);
  }
  await assert.rejects(verifyEmailWithCode(store, user.id, code), InvalidCodeError);
  assert.equal(await store.getAuthCode(user.id, "verify_email"), null);
});

test("resend rate limit: a fresh code inside the cooldown is refused; after it, resend kills the old code", async () => {
  const { store, mailer, user } = await freshAccount();
  const firstCode = codeFrom(mailer.messages[0]);

  await assert.rejects(sendVerificationCode(store, mailer, user), ResendTooSoonError);
  assert.equal(mailer.messages.length, 1, "no second email during the cooldown");

  const record = await store.getAuthCode(user.id, "verify_email");
  assert.ok(record);
  record.createdAt = new Date(Date.now() - 61_000).toISOString();

  const resent = await sendVerificationCode(store, mailer, user);
  assert.equal(resent.delivery, "sent");
  assert.equal(mailer.messages.length, 2);
  const secondCode = codeFrom(mailer.messages[1]);

  // The replaced code is dead; the fresh one verifies.
  if (secondCode !== firstCode) {
    await assert.rejects(verifyEmailWithCode(store, user.id, firstCode), InvalidCodeError);
  }
  const verified = await verifyEmailWithCode(store, user.id, secondCode);
  assert.ok(verified.emailVerifiedAt);
});

// ---------------------------------------------------------------------
// Password reset — email OR phone identifier, code to the email on file
// ---------------------------------------------------------------------

test("reset by EMAIL identifier: code emailed, password replaced, old password dead", async () => {
  const { store, mailer, user } = await freshAccount();
  const before = mailer.messages.length;

  const answer = await requestPasswordReset(store, mailer, "  Casey@Example.COM ");
  assert.deepEqual(answer, { accepted: true });
  assert.equal(mailer.messages.length, before + 1);
  const mail = mailer.messages[before];
  assert.equal(mail.to, user.email);
  assert.match(mail.subject, /reset/i);
  const code = codeFrom(mail);

  await assert.rejects(resetPassword(store, DRIVER.email, wrongCodeFor(code), "brand new password"), InvalidCodeError);
  const updated = await resetPassword(store, DRIVER.email, code, "brand new password");
  assert.equal(updated.id, user.id);

  const relogin = await loginDriver(store, { email: DRIVER.email, password: "brand new password" });
  assert.equal(relogin.user.id, user.id);
  await assert.rejects(
    loginDriver(store, { email: DRIVER.email, password: DRIVER.password }),
    /incorrect/i,
  );
});

test("reset by PHONE identifier (any formatting): same account, code still emailed to the address on file", async () => {
  const { store, mailer, user } = await freshAccount();
  const before = mailer.messages.length;

  const answer = await requestPasswordReset(store, mailer, "617-555-0134");
  assert.deepEqual(answer, { accepted: true });
  assert.equal(mailer.messages.length, before + 1);
  const mail = mailer.messages[before];
  // Delivered to the EMAIL on file — there is no SMS path.
  assert.equal(mail.to, DRIVER.email);

  const updated = await resetPassword(store, "+1 (617) 555-0134", codeFrom(mail), "second new password");
  assert.equal(updated.id, user.id);
  const relogin = await loginDriver(store, { email: DRIVER.email, password: "second new password" });
  assert.equal(relogin.user.id, user.id);
});

test("reset anti-enumeration: unknown identifiers answer identically and send nothing", async () => {
  const { store, mailer } = await freshAccount();
  const before = mailer.messages.length;

  const byEmail = await requestPasswordReset(store, mailer, "nobody@example.com");
  const byPhone = await requestPasswordReset(store, mailer, "(212) 555-9999");
  const garbage = await requestPasswordReset(store, mailer, "not-an-identifier");
  assert.deepEqual(byEmail, { accepted: true });
  assert.deepEqual(byPhone, byEmail);
  assert.deepEqual(garbage, byEmail);
  assert.equal(mailer.messages.length, before, "no mail for unknown identifiers");

  // A reset attempt against an unknown identifier fails with the SAME
  // generic error a wrong code produces — no existence oracle.
  await assert.rejects(resetPassword(store, "nobody@example.com", "123456", "whatever password"), InvalidCodeError);
});

test("reset code is single-use: a second reset with the same code is refused", async () => {
  const { store, mailer } = await freshAccount();
  await requestPasswordReset(store, mailer, DRIVER.email);
  const code = codeFrom(mailer.messages[mailer.messages.length - 1]);
  await resetPassword(store, DRIVER.email, code, "one time password");
  await assert.rejects(resetPassword(store, DRIVER.email, code, "replay password"), InvalidCodeError);
  // The first (successful) password is still the live one.
  const relogin = await loginDriver(store, { email: DRIVER.email, password: "one time password" });
  assert.ok(relogin.token);
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

test("vehicle spec: missing mileage is refused; missing engine is refused", async () => {
  const store = new MemoryAppStore();
  const { mileage: _m, ...noMileage } = VEHICLE;
  await assert.rejects(createVehicle(store, "user-a", noMileage), ValidationError);
  const { engine: _e, ...noEngine } = VEHICLE;
  await assert.rejects(createVehicle(store, "user-a", noEngine), ValidationError);
  await assert.rejects(createVehicle(store, "user-a", { ...VEHICLE, engine: "  " }), ValidationError);
  await assert.rejects(createVehicle(store, "user-a", { ...VEHICLE, mileage: "" }), ValidationError);
});

test("vehicle spec: the required five alone are accepted; optional fields default to null", async () => {
  const store = new MemoryAppStore();
  const vehicle = await createVehicle(store, "user-a", VEHICLE);
  assert.equal(vehicle.engine, "1.5L 4-cylinder");
  assert.equal(vehicle.mileage, 62_000);
  assert.equal(vehicle.trim, null);
  assert.equal(vehicle.vin, null);
  assert.equal(vehicle.color, null);
  assert.equal(vehicle.licensePlate, null);
});

test("vehicle spec: optional fields are stored (plate uppercased); engine patch validates", async () => {
  const store = new MemoryAppStore();
  const vehicle = await createVehicle(store, "user-a", {
    ...VEHICLE,
    trim: "EX",
    vin: "1HGCV1F34KA000000",
    color: "Silver",
    licensePlate: "abc 123",
  });
  assert.equal(vehicle.trim, "EX");
  assert.equal(vehicle.vin, "1HGCV1F34KA000000");
  assert.equal(vehicle.color, "Silver");
  assert.equal(vehicle.licensePlate, "ABC 123");

  const patched = await updateVehicle(store, "user-a", vehicle.id, { engine: "2.0L 4-cylinder turbo" });
  assert.equal(patched.engine, "2.0L 4-cylinder turbo");
  await assert.rejects(
    updateVehicle(store, "user-a", vehicle.id, { engine: "" }),
    ValidationError,
  );
});
