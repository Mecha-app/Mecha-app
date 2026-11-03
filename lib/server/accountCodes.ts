import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { ValidationError } from "./authService";
import { AlreadyVerifiedError, InvalidCodeError, ResendTooSoonError } from "./errors";
import { normalizeEmail, normalizePhone } from "./identity";
import type { Mailer } from "./mailer";
import { hashPassword } from "./passwords";
import type { AuthCodePurpose, IdentityStore, UserRecord } from "./store";

/**
 * Account codes (0011) — email verification + password reset, shared by
 * the HTTP routes and the test-suite.
 *
 * THE DISCIPLINE (owner's funnel + standard account security):
 *   - A code is 6 digits, lives 15 minutes, allows at most 5 attempts,
 *     and is SINGLE-USE: a successful check deletes it, and issuing a
 *     fresh code replaces (kills) the previous one.
 *   - Only a SHA-256 hash of (user id + purpose + code) is stored; the
 *     plaintext travels in the email and nowhere else — never logged.
 *   - Verification is a SOFT GATE: the account works from the moment it
 *     is created; verification is a dashboard banner, not a wall.
 *   - Password reset accepts an EMAIL or a PHONE NUMBER as the
 *     identifier, but the code is always delivered to the EMAIL ON
 *     FILE — there is no SMS provider and nothing pretends otherwise.
 *   - Anti-enumeration: a reset request answers identically whether or
 *     not the identifier matches an account, and a reset attempt fails
 *     with ONE generic error for every bad path (unknown identifier,
 *     no live code, expired, wrong code, attempts exhausted).
 *
 * The primitives (generateCode / hashCode / issueCode / consumeCode)
 * are exported for ONE consumer: lib/server/codeAuth.ts, the
 * code-first sign-up + code sign-in door (0013), which reuses this
 * exact discipline — same TTL, same attempt cap, same single-use —
 * for its 'signin' purpose and its pre-account pending codes.
 */

export const CODE_TTL_MS = 15 * 60_000;
export const CODE_MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60_000;

export type CodeDeliveryStatus = "sent" | "not_configured" | "failed";

export function hashCode(userId: string, purpose: string, code: string): string {
  return createHash("sha256").update(`${userId}:${purpose}:${code}`).digest("hex");
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Issue a fresh code for (user, purpose) — replacing any live one — and
 * hand the plaintext to the mailer. Returns the delivery status; the
 * code itself never leaves this module except inside the email body.
 */
export async function issueCode(
  store: IdentityStore,
  mailer: Mailer,
  user: UserRecord,
  purpose: AuthCodePurpose,
  mail: { subject: string; intro: string },
): Promise<{ delivery: CodeDeliveryStatus }> {
  const code = generateCode();
  await store.saveAuthCode({
    userId: user.id,
    purpose,
    codeHash: hashCode(user.id, purpose, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  const result = await mailer.send({
    to: user.email,
    subject: mail.subject,
    text: [
      `Hi ${user.name},`,
      "",
      mail.intro,
      "",
      `Your code is: ${code}`,
      "",
      "It lasts 15 minutes. If you didn't ask for it, you can ignore this email — nothing changes.",
      "",
      "— MECHA",
    ].join("\n"),
  });
  return { delivery: result.status };
}

/**
 * Consume a code: every failure path throws the SAME InvalidCodeError
 * (see errors.ts). On success the code is deleted (single-use).
 */
export async function consumeCode(
  store: IdentityStore,
  userId: string,
  purpose: AuthCodePurpose,
  codeInput: unknown,
): Promise<void> {
  const code = typeof codeInput === "string" ? codeInput.trim() : "";
  const record = await store.getAuthCode(userId, purpose);
  if (!record) throw new InvalidCodeError();
  if (Date.now() > Date.parse(record.expiresAt)) {
    await store.deleteAuthCode(userId, purpose);
    throw new InvalidCodeError();
  }
  if (record.attempts >= CODE_MAX_ATTEMPTS) {
    await store.deleteAuthCode(userId, purpose);
    throw new InvalidCodeError();
  }
  if (!/^\d{6}$/.test(code) || !hashesEqual(hashCode(userId, purpose, code), record.codeHash)) {
    const attempts = await store.recordAuthCodeAttempt(userId, purpose);
    if (attempts >= CODE_MAX_ATTEMPTS) await store.deleteAuthCode(userId, purpose);
    throw new InvalidCodeError();
  }
  await store.deleteAuthCode(userId, purpose);
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/**
 * Send (or resend) the verification code. A fresh code inside the
 * cooldown window is refused with ResendTooSoonError — the resend
 * rate limit — unless the caller is the registration flow itself
 * (a brand-new account has no live code, so the check passes anyway).
 */
export async function sendVerificationCode(
  store: IdentityStore,
  mailer: Mailer,
  user: UserRecord,
): Promise<{ delivery: CodeDeliveryStatus }> {
  if (user.emailVerifiedAt) throw new AlreadyVerifiedError();
  const existing = await store.getAuthCode(user.id, "verify_email");
  if (existing) {
    const ageMs = Date.now() - Date.parse(existing.createdAt);
    if (ageMs < RESEND_COOLDOWN_MS) {
      throw new ResendTooSoonError(Math.ceil((RESEND_COOLDOWN_MS - ageMs) / 1000));
    }
  }
  return issueCode(store, mailer, user, "verify_email", {
    subject: "Your MECHA verification code",
    intro: "Use this code to verify your email address for your MECHA account.",
  });
}

/** Verify the signed-in account's email with its code. Soft gate: this
 * only stamps email_verified_at; nothing else about the account changes. */
export async function verifyEmailWithCode(
  store: IdentityStore,
  userId: string,
  codeInput: unknown,
): Promise<UserRecord> {
  const user = await store.findUserById(userId);
  if (!user) throw new InvalidCodeError();
  if (user.emailVerifiedAt) throw new AlreadyVerifiedError();
  await consumeCode(store, userId, "verify_email", codeInput);
  await store.markEmailVerified(userId);
  const updated = await store.findUserById(userId);
  if (!updated) throw new InvalidCodeError();
  return updated;
}

// ---------------------------------------------------------------------------
// Password reset — identifier is an email OR a phone number; the code
// always goes to the email on file (no SMS provider exists).
// ---------------------------------------------------------------------------

/**
 * Resolve a reset identifier to its account: an email when the input
 * parses as one, otherwise a phone number normalized the identity way.
 * Formatted differently ("(617) 555-0134" vs "+1 617 555 0134") makes
 * no difference — it is the same identity key registration used.
 */
export async function resolveAccountIdentifier(
  store: IdentityStore,
  identifier: unknown,
): Promise<UserRecord | null> {
  if (typeof identifier !== "string") return null;
  const email = normalizeEmail(identifier);
  if (email) return store.findUserByEmail(email);
  const phone = normalizePhone(identifier);
  if (phone) return store.findUserByPhone(phone);
  return null;
}

/**
 * Request a reset code. ANTI-ENUMERATION: the return value is identical
 * whether or not the identifier matches an account — the caller renders
 * the same sentence either way ("if an account matches, we've emailed
 * a code to the address on file"). Only the mailer knows the difference.
 */
export async function requestPasswordReset(
  store: IdentityStore,
  mailer: Mailer,
  identifier: unknown,
): Promise<{ accepted: true }> {
  const user = await resolveAccountIdentifier(store, identifier);
  if (user) {
    await issueCode(store, mailer, user, "reset_password", {
      subject: "Reset your MECHA password",
      intro:
        "Use this code to reset your MECHA password. You can start the reset with your email address or the phone number on your account — the code always comes to this email.",
    });
  }
  return { accepted: true };
}

/**
 * Complete a reset: code + new password. On success the account's hash
 * is replaced (bcrypt, same cost discipline as registration) and the
 * code is gone. NOTE (recorded in STATUS): session JWTs are stateless
 * 30-day tokens and are NOT revoked by a reset — a signed-in device
 * stays signed in. That residual is a cutover decision, not silently
 * "fixed" here.
 */
export async function resetPassword(
  store: IdentityStore,
  identifier: unknown,
  codeInput: unknown,
  newPassword: unknown,
): Promise<UserRecord> {
  const password = typeof newPassword === "string" ? newPassword : "";
  if (password.length < 8) {
    throw new ValidationError('"password" must be at least 8 characters.');
  }
  const user = await resolveAccountIdentifier(store, identifier);
  if (!user) throw new InvalidCodeError();
  await consumeCode(store, user.id, "reset_password", codeInput);
  await store.updatePasswordHash(user.id, await hashPassword(password));
  const updated = await store.findUserById(user.id);
  if (!updated) throw new InvalidCodeError();
  return updated;
}
