import { sendVerificationCode, type CodeDeliveryStatus } from "./accountCodes";
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

export class InvalidCredentialsError extends Error {
  readonly code = "invalid_credentials";
  constructor() {
    super("Email or password is incorrect.");
    this.name = "InvalidCredentialsError";
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
  input: { name?: unknown; email?: unknown; phone?: unknown; password?: unknown },
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
  if (!user || !user.passwordHash || !ok) throw new InvalidCredentialsError();
  return toAuthResult(user);
}

export function publicUser(user: UserRecord): PublicUser {
  return toPublicUser(user);
}

export function quotaOf(user: UserRecord): QuotaState {
  return quotaStateFor({ plan: user.plan, freeDiagnosesUsed: user.freeDiagnosesUsed });
}
