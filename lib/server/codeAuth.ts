import { createHmac, timingSafeEqual } from "node:crypto";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MS,
  RESEND_COOLDOWN_MS,
  consumeCode,
  generateCode,
  hashCode,
  issueCode,
} from "./accountCodes";
import { authResultFor, registerDriver, type AuthResult } from "./authService";
import { InvalidCodeError } from "./errors";
import { normalizeEmail } from "./identity";
import { AuthNotConfiguredError, isAuthConfigured } from "./jwt";
import type { Mailer } from "./mailer";
import type { IdentityStore } from "./store";

/**
 * Code-first sign-up + code sign-in (0013) — the owner's "make it
 * easy, just like the big brand" door, shared by the HTTP routes and
 * the test-suite.
 *
 * ONE DOOR: the visitor types an email; the system emails a 6-digit
 * code. The SAME request serves both crowds, decided server-side by
 * whether the email already has an account:
 *   - account exists → a 'signin' code (auth_codes, bound to the user
 *     row). Verifying it SIGNS THE PERSON IN — no password needed.
 *   - no account → a PENDING signup code (pending_signup_codes, keyed
 *     by the normalized email — there is no user row yet). Verifying
 *     it returns a short-lived signed TICKET binding that email; the
 *     details form (name + password typed twice + optional phone) is
 *     presented with the ticket, and the account is created ALREADY
 *     EMAIL-VERIFIED — the code just proved control of the inbox.
 * No dead ends: an existing customer who lands on /register is signed
 * in by the code instead of being told to go away, and a new visitor
 * who lands on /login is walked into account creation.
 *
 * THE DISCIPLINE is the account-codes discipline (0011), reused, not
 * reinvented: 6 digits, 15 minutes, at most 5 attempts, single-use,
 * fresh issue replaces the old code, only a SHA-256 hash at rest, a
 * 60-second resend cooldown, and ONE generic InvalidCodeError for
 * every verification failure (no live code, expired, wrong code,
 * attempts exhausted, bad ticket). The request itself is
 * anti-enumeration: it answers { accepted: true } identically for
 * known, unknown, and unusable emails, and inside the cooldown it
 * silently skips the re-issue — the outside world cannot tell the
 * difference. Delivery goes by EMAIL ONLY: there is no SMS provider
 * in this stack, and the phone is an identity field, never a code
 * channel.
 *
 * Phone stays OPTIONAL through this whole door (owner, 0013): the
 * account keys on email always and on phone when present; the
 * diagnosis gate still refuses a phone-less account before any quota
 * consume (diagnoseService's PhoneRequiredError), so nobody runs a
 * diagnosis until email AND phone are both on file.
 */

// ---------------------------------------------------------------------------
// Signup ticket — the verified-email proof carried from "code checked"
// to "create the account". Stateless on purpose: an HMAC-signed payload
// (same secret family as the session JWTs), 15-minute life, bound to
// the one email the code proved. It creates nothing by itself; the
// completion call re-runs every registration check (including the
// identity conflicts) before a row exists.
// ---------------------------------------------------------------------------

const SIGNUP_TICKET_TTL_MS = 15 * 60_000;
const SIGNUP_TICKET_SCOPE = "mecha-signup-ticket";

function ticketSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length === 0) throw new AuthNotConfiguredError();
  return s;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").split("+").join("-").split("/").join("_").split("=")[0];
}

function base64UrlDecode(s: string): Buffer {
  const b64 = s.split("-").join("+").split("_").join("/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function signSignupTicket(email: string): string {
  const payload = base64UrlEncode(
    Buffer.from(
      JSON.stringify({ email, purpose: "signup", exp: Date.now() + SIGNUP_TICKET_TTL_MS }),
      "utf8",
    ),
  );
  const signature = base64UrlEncode(
    createHmac("sha256", ticketSecret()).update(`${SIGNUP_TICKET_SCOPE}.${payload}`).digest(),
  );
  return `${payload}.${signature}`;
}

/** The email a valid ticket binds, or null for anything else —
 * forged, malformed, wrong purpose, or expired all read the same. */
function verifySignupTicket(ticket: unknown): string | null {
  if (typeof ticket !== "string" || !isAuthConfigured()) return null;
  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = base64UrlEncode(
    createHmac("sha256", ticketSecret()).update(`${SIGNUP_TICKET_SCOPE}.${payload}`).digest(),
  );
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(payload).toString("utf8")) as {
      email?: unknown;
      purpose?: unknown;
      exp?: unknown;
    };
    if (parsed.purpose !== "signup") return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return normalizeEmail(parsed.email);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Request — one door, anti-enumeration
// ---------------------------------------------------------------------------

/** The hash subject a pending code is keyed under (never a user id —
 * there is no user yet; the purpose string keeps the domains apart). */
function pendingSubject(email: string): string {
  return `pending:${email}`;
}

function insideCooldown(createdAtIso: string): boolean {
  return Date.now() - Date.parse(createdAtIso) < RESEND_COOLDOWN_MS;
}

/**
 * Ask for an email code. ALWAYS answers { accepted: true } — known,
 * unknown, and unusable emails are indistinguishable from outside,
 * and a request inside the resend cooldown silently keeps the live
 * code instead of mailing a second one. Which flow the code belongs
 * to (sign-in vs sign-up) is decided here, server-side, and revealed
 * only to whoever controls the inbox.
 */
export async function requestEmailCode(
  store: IdentityStore,
  mailer: Mailer,
  emailInput: unknown,
): Promise<{ accepted: true }> {
  const email = normalizeEmail(emailInput);
  if (!email) return { accepted: true };

  const user = await store.findUserByEmail(email);
  if (user) {
    const live = await store.getAuthCode(user.id, "signin");
    if (live && insideCooldown(live.createdAt)) return { accepted: true };
    await issueCode(store, mailer, user, "signin", {
      subject: "Your MECHA sign-in code",
      intro: "Use this code to sign in to your MECHA account — no password needed.",
    });
    return { accepted: true };
  }

  const pending = await store.getPendingSignupCode(email);
  if (pending && insideCooldown(pending.createdAt)) return { accepted: true };
  const code = generateCode();
  await store.savePendingSignupCode({
    email,
    codeHash: hashCode(pendingSubject(email), "signup", code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  await mailer.send({
    to: email,
    subject: "Your MECHA sign-up code",
    text: [
      "Hi,",
      "",
      "Use this code to create your MECHA account.",
      "",
      `Your code is: ${code}`,
      "",
      "It lasts 15 minutes. If you didn't ask for it, you can ignore this email — nothing changes.",
      "",
      "— MECHA",
    ].join("\n"),
  });
  return { accepted: true };
}

// ---------------------------------------------------------------------------
// Verify — sign-in for existing accounts, ticket for new ones
// ---------------------------------------------------------------------------

/**
 * Consume a pending signup code with EXACTLY consumeCode's discipline
 * (0011): every failure throws the same InvalidCodeError; success
 * deletes the code (single-use).
 */
async function consumePendingSignupCode(
  store: IdentityStore,
  email: string,
  codeInput: unknown,
): Promise<void> {
  const code = typeof codeInput === "string" ? codeInput.trim() : "";
  const record = await store.getPendingSignupCode(email);
  if (!record) throw new InvalidCodeError();
  if (Date.now() > Date.parse(record.expiresAt)) {
    await store.deletePendingSignupCode(email);
    throw new InvalidCodeError();
  }
  if (record.attempts >= CODE_MAX_ATTEMPTS) {
    await store.deletePendingSignupCode(email);
    throw new InvalidCodeError();
  }
  const expected = hashCode(pendingSubject(email), "signup", code);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(record.codeHash, "utf8");
  if (!/^\d{6}$/.test(code) || a.length !== b.length || !timingSafeEqual(a, b)) {
    const attempts = await store.recordPendingSignupCodeAttempt(email);
    if (attempts >= CODE_MAX_ATTEMPTS) await store.deletePendingSignupCode(email);
    throw new InvalidCodeError();
  }
  await store.deletePendingSignupCode(email);
}

export type EmailCodeOutcome =
  | { kind: "signed_in"; result: AuthResult }
  | { kind: "signup_verified"; ticket: string };

/**
 * Check an email code. If the email has an account, the matching
 * 'signin' code signs the person in (and stamps the email verified
 * when it wasn't — controlling the inbox just proved it, the same
 * earning rule as a Google link). If it doesn't, the matching pending
 * code is consumed and a signup ticket for that email comes back.
 * Every failure is the one generic InvalidCodeError.
 */
export async function verifyEmailCode(
  store: IdentityStore,
  emailInput: unknown,
  codeInput: unknown,
): Promise<EmailCodeOutcome> {
  const email = normalizeEmail(emailInput);
  if (!email) throw new InvalidCodeError();
  const user = await store.findUserByEmail(email);
  if (user) {
    await consumeCode(store, user.id, "signin", codeInput);
    if (!user.emailVerifiedAt) {
      await store.markEmailVerified(user.id);
      const stamped = await store.findUserById(user.id);
      return { kind: "signed_in", result: authResultFor(stamped ?? user) };
    }
    return { kind: "signed_in", result: authResultFor(user) };
  }
  await consumePendingSignupCode(store, email, codeInput);
  return { kind: "signup_verified", ticket: signSignupTicket(email) };
}

// ---------------------------------------------------------------------------
// Complete — create the account behind a verified ticket
// ---------------------------------------------------------------------------

/**
 * Create the account a signup ticket authorizes. The ticket proves
 * the email; EVERYTHING else is re-checked by registerDriver exactly
 * as the classic form is (name, password ≥ 8, the password typed
 * twice, the phone conflict when a phone is given) — and if the email
 * was registered by another path in the meantime, the honest
 * IdentityConflictError answers instead of a second account. The
 * account is created already email-verified (emailPreVerified): the
 * code earned the stamp before the row existed.
 */
export async function completeCodeSignup(
  store: IdentityStore,
  ticketInput: unknown,
  input: {
    name?: unknown;
    phone?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  },
): Promise<AuthResult> {
  const email = verifySignupTicket(ticketInput);
  if (!email) throw new InvalidCodeError();
  return registerDriver(store, { ...input, email }, { emailPreVerified: true });
}
