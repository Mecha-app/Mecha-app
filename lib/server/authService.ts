import { sendVerificationCode, type CodeDeliveryStatus } from "./accountCodes";
import { NotFoundError } from "./errors";
import {
  GoogleTokenVerificationError,
  type GoogleIdTokenClaims,
  type GoogleTokenVerifier,
} from "./googleAuth";
import { normalizeEmail, normalizePhone } from "./identity";
import { signToken } from "./jwt";
import { getMailer, type Mailer } from "./mailer";
import { hashPassword, verifyPassword } from "./passwords";
import { quotaStateFor, type QuotaState } from "./quota";
import { IdentityConflictError, type IdentityStore, type UserRecord } from "./store";

/**
 * Account service (WP5) — registration + login for driver accounts,
 * shared by the HTTP routes and the test-suite.
 *
 * THE IDENTITY RULE (owner's hard rule): an identity is recognized by
 * its email AND its phone number. Registration checks BOTH keys before
 * creating anything:
 *   - same email → the identity already exists (IdentityConflictError)
 *   - same phone, different email → the identity already exists
 * In both cases NOTHING is created and NOTHING is reset — the person
 * signs in to the account they already have, with its diagnosis count
 * exactly where they left it. That is what "reattach" means here: there
 * is only ever one quota per human, because there is only ever one row.
 */

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  /** Soft gate (0011): false until the email code is confirmed; the
   * account works either way — the dashboard shows a verify banner. */
  emailVerified: boolean;
  type: "driver";
}

export interface AuthResult {
  token: string;
  user: PublicUser;
  quota: QuotaState;
  /** Registration only: the verification email's delivery state. */
  verificationDelivery?: CodeDeliveryStatus;
}

export class ValidationError extends Error {
  readonly code = "invalid_request";
  constructor(detail: string) {
    super(detail);
    this.name = "ValidationError";
  }
}

/**
 * Registration sent a password confirmation that does not match the
 * password (owner's rule, 2026-11-03: a person verifies the password
 * TWICE before an account exists). The web form checks this before
 * sending anything; the service checks it again — defense in depth —
 * so an API caller that skips the form cannot create an account with
 * an unconfirmed password either. Nothing is created on this path.
 */
export class PasswordMismatchError extends Error {
  readonly code = "password_mismatch";
  constructor() {
    super("The passwords don't match — check them and try again.");
    this.name = "PasswordMismatchError";
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = "invalid_credentials";
  constructor() {
    super("Email or password is incorrect.");
    this.name = "InvalidCredentialsError";
  }
}

/**
 * Password sign-in attempted against a GOOGLE-ONLY account (the
 * legacy Google customers the ETL carries: google_sub set, password
 * hash NULL). This is NOT "wrong password" — there is no password on
 * the account to be wrong about, and telling the customer that sends
 * them into a reset flow that can never work. The honest, specific
 * answer: this account uses Google sign-in. (The login page renders
 * the dictionary copy for this code; this message is the API's text.)
 */
export class GoogleOnlyAccountError extends Error {
  readonly code = "google_signin_required";
  constructor() {
    super("This account uses Google sign-in — continue with Google instead of a password.");
    this.name = "GoogleOnlyAccountError";
  }
}

/**
 * A Google sign-in whose email matches an existing account but whose
 * email Google has NOT verified. Linking on an unverified email would
 * hand the account to whoever controls an unverified claim — refused,
 * honestly, with nothing linked and nothing created.
 */
export class GoogleLinkRefusedError extends Error {
  readonly code = "google_link_refused";
  constructor() {
    super(
      "Google didn't verify that email address, so it can't be linked to the existing account. Sign in with your password instead.",
    );
    this.name = "GoogleLinkRefusedError";
  }
}

/**
 * The OAuth callback's state didn't match the state cookie (or either
 * was missing). The flow stops here — a mismatched state is treated
 * as a forged or stale callback, never as a sign-in.
 */
export class GoogleStateMismatchError extends Error {
  readonly code = "google_state_mismatch";
  constructor() {
    super("The Google sign-in state did not match — the sign-in was not completed.");
    this.name = "GoogleStateMismatchError";
  }
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    plan: user.plan,
    emailVerified: user.emailVerifiedAt !== null,
    type: "driver",
  };
}

/** Build the standard auth payload for an account record (login,
 * registration, and the completed password reset all answer this). */
export function authResultFor(user: UserRecord): AuthResult {
  return toAuthResult(user);
}

function toAuthResult(user: UserRecord): AuthResult {
  return {
    token: signToken({ id: user.id, type: "driver" }),
    user: toPublicUser(user),
    quota: quotaStateFor({ plan: user.plan, freeDiagnosesUsed: user.freeDiagnosesUsed }),
  };
}

export async function registerDriver(
  store: IdentityStore,
  input: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  },
  deps: { mailer?: Mailer } = {},
): Promise<AuthResult> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length === 0 || name.length > 120) {
    throw new ValidationError('A non-empty "name" is required.');
  }
  const email = normalizeEmail(input.email);
  if (!email) throw new ValidationError('A valid "email" is required.');

  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < 8) {
    throw new ValidationError('"password" must be at least 8 characters.');
  }

  // Password verified twice (owner's rule, 2026-11-03). The web form
  // always sends the confirmation and blocks a mismatch before the
  // request leaves the browser; when a confirmation IS sent, the
  // service enforces the match too. Callers that send none keep the
  // pre-existing behavior — the field is an added guard, not a new
  // requirement on the API's older consumers.
  if (input.confirmPassword !== undefined && input.confirmPassword !== password) {
    throw new PasswordMismatchError();
  }

  // Phone is optional at the form level, but when given it becomes an
  // identity key — an unparseable phone would silently weaken the rule,
  // so it is rejected rather than dropped.
  let phone: string | null = null;
  let phoneNormalized: string | null = null;
  if (typeof input.phone === "string" && input.phone.trim().length > 0) {
    phoneNormalized = normalizePhone(input.phone);
    if (!phoneNormalized) {
      throw new ValidationError('"phone" could not be read — include the full number.');
    }
    phone = input.phone.trim();
  }

  // Identity resolution BEFORE creation — email first, then phone.
  if (await store.findUserByEmail(email)) throw new IdentityConflictError("email");
  if (phoneNormalized && (await store.findUserByPhone(phoneNormalized))) {
    throw new IdentityConflictError("phone");
  }

  const passwordHash = await hashPassword(password);
  const user = await store.createUser({
    name,
    email,
    phone,
    phoneNormalized,
    passwordHash,
    authMethod: "email",
  });
  const result = toAuthResult(user);
  // Verification code (0011) — issued + emailed best-effort. A mail
  // failure NEVER fails the registration: the account works from this
  // moment (soft gate), the code exists server-side, and the dashboard
  // banner offers a resend. The delivery state rides on the result so
  // the API can state it honestly.
  try {
    const sent = await sendVerificationCode(store, deps.mailer ?? getMailer(), user);
    result.verificationDelivery = sent.delivery;
  } catch {
    result.verificationDelivery = "failed";
  }
  return result;
}

// Timing equalization (security pass): when the account does not exist
// (or has no password hash), login still runs one bcrypt compare against
// a dummy hash, so the response time does not reveal whether the email
// is registered. The error is already identical on every failure path.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("mecha-timing-equalization-dummy");
  }
  return dummyHashPromise;
}

export async function loginDriver(
  store: IdentityStore,
  input: { email?: unknown; password?: unknown },
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || password.length === 0) throw new InvalidCredentialsError();
  const user = await store.findUserByEmail(email);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user) throw new InvalidCredentialsError();
  // Google-only account (hash NULL): the honest, specific error — the
  // timing-equalized compare above already ran, so this reveal costs
  // no timing signal beyond what the account type requires.
  if (!user.passwordHash) throw new GoogleOnlyAccountError();
  if (!ok) throw new InvalidCredentialsError();
  return toAuthResult(user);
}

// ---------------------------------------------------------------------------
// Google sign-in (social login package) — DRIVERS ONLY. Shops and
// towing keep email/password in this package: a business's identity is
// its listing + plan, and the owner has not ordered social sign-in for
// them.
//
// Account resolution, in order:
//   (a) google_sub match — the stable Google identity wins, even if
//       the Google profile's email has changed since the link.
//   (b) email match on a GOOGLE-VERIFIED email — link (set google_sub,
//       stamp email_verified_at if null) and sign in. An unverified
//       email claim links NOTHING (GoogleLinkRefusedError).
//   (c) no match — create the driver account from the Google profile:
//       password_hash NULL, email_verified_at stamped (Google verified
//       it), phone NULL. The account is INCOMPLETE until the phone is
//       added: the owner's quota identity is email AND phone, so
//       diagnoseService refuses a diagnosis until then (see
//       completePhone + /app/complete-profile).
// ---------------------------------------------------------------------------

export async function resolveGoogleAccount(
  store: IdentityStore,
  claims: GoogleIdTokenClaims,
): Promise<AuthResult> {
  // (a) The Google identity itself.
  const bySub = await store.findUserByGoogleSub(claims.sub);
  if (bySub) return toAuthResult(bySub);

  const email = normalizeEmail(claims.email);
  if (!email) throw new GoogleTokenVerificationError();

  // (b) Link by verified email.
  const byEmail = await store.findUserByEmail(email);
  if (byEmail) {
    if (!claims.emailVerified) throw new GoogleLinkRefusedError();
    const linked = await store.linkGoogleAccount(byEmail.id, claims.sub);
    return toAuthResult(linked ?? byEmail);
  }

  // (c) A new driver account from the Google profile.
  const name =
    claims.name.trim().length > 0 ? claims.name.trim().slice(0, 120) : email.split("@")[0];
  const user = await store.createUser({
    name,
    email,
    phone: null,
    phoneNormalized: null,
    passwordHash: null,
    googleSub: claims.sub,
    authMethod: "google",
  });
  // Google proved the person controls this Google account — the sub
  // is the identity, so the account is created either way. The
  // verified stamp is applied only when Google actually asserted the
  // email as verified; otherwise the account starts unverified like
  // any other signup and the soft-gate banner offers the code flow.
  if (claims.emailVerified) {
    await store.markEmailVerified(user.id);
    const stamped = await store.findUserById(user.id);
    return toAuthResult(stamped ?? user);
  }
  return toAuthResult(user);
}

export interface GoogleCallbackDeps {
  verifier: GoogleTokenVerifier;
  exchangeCode: (code: string) => Promise<string>;
}

/**
 * The callback's core, with the state check FIRST (a mismatch stops
 * everything — no exchange, no verification, no account work), then
 * the code exchange, then ID-token verification through the injected
 * verifier, then account resolution. The route is a thin adapter over
 * this; tests drive it with the stub verifier + a stub exchange.
 */
export async function completeGoogleSignIn(
  store: IdentityStore,
  input: { code?: string | null; state?: string | null; expectedState?: string | null },
  deps: GoogleCallbackDeps,
): Promise<AuthResult> {
  if (
    !input.code ||
    !input.state ||
    !input.expectedState ||
    input.state !== input.expectedState
  ) {
    throw new GoogleStateMismatchError();
  }
  const idToken = await deps.exchangeCode(input.code);
  const claims = await deps.verifier.verifyIdToken(idToken);
  return resolveGoogleAccount(store, claims);
}

// ---------------------------------------------------------------------------
// Phone completion — a Google-created account starts phone-less, and
// the owner's identity rule (email AND phone) means it cannot consume
// a diagnosis until the phone is on file. Completing it here checks
// the phone identity key exactly like registration does: a number
// that already belongs to a DIFFERENT account is an honest conflict —
// accounts are never silently merged.
// ---------------------------------------------------------------------------

export async function completePhone(
  store: IdentityStore,
  userId: string,
  input: { phone?: unknown },
): Promise<AuthResult> {
  const user = await store.findUserById(userId);
  if (!user) throw new NotFoundError("The signed-in account no longer exists.");
  const phoneNormalized = normalizePhone(input.phone);
  if (!phoneNormalized) {
    throw new ValidationError('"phone" could not be read — include the full number.');
  }
  const existing = await store.findUserByPhone(phoneNormalized);
  if (existing && existing.id !== userId) throw new IdentityConflictError("phone");
  const updated = await store.updateUserPhone(
    userId,
    typeof input.phone === "string" ? input.phone.trim() : phoneNormalized,
    phoneNormalized,
  );
  return toAuthResult(updated ?? user);
}

export function publicUser(user: UserRecord): PublicUser {
  return toPublicUser(user);
}

export function quotaOf(user: UserRecord): QuotaState {
  return quotaStateFor({ plan: user.plan, freeDiagnosesUsed: user.freeDiagnosesUsed });
}
