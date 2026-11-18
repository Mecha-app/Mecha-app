"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStateMismatchError = exports.GoogleLinkRefusedError = exports.GoogleOnlyAccountError = exports.InvalidCredentialsError = exports.PasswordMismatchError = exports.ValidationError = void 0;
exports.authResultFor = authResultFor;
exports.registerDriver = registerDriver;
exports.loginDriver = loginDriver;
exports.resolveGoogleAccount = resolveGoogleAccount;
exports.completeGoogleSignIn = completeGoogleSignIn;
exports.completePhone = completePhone;
exports.publicUser = publicUser;
exports.quotaOf = quotaOf;
const accountCodes_1 = require("./accountCodes");
const errors_1 = require("./errors");
const googleAuth_1 = require("./googleAuth");
const identity_1 = require("./identity");
const jwt_1 = require("./jwt");
const mailer_1 = require("./mailer");
const passwords_1 = require("./passwords");
const quota_1 = require("./quota");
const store_1 = require("./store");
class ValidationError extends Error {
    code = "invalid_request";
    constructor(detail) {
        super(detail);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
/**
 * Registration sent a password confirmation that does not match the
 * password (owner's rule, 2026-11-03: a person verifies the password
 * TWICE before an account exists). The web form checks this before
 * sending anything; the service checks it again — defense in depth —
 * so an API caller that skips the form cannot create an account with
 * an unconfirmed password either. Nothing is created on this path.
 */
class PasswordMismatchError extends Error {
    code = "password_mismatch";
    constructor() {
        super("The passwords don't match — check them and try again.");
        this.name = "PasswordMismatchError";
    }
}
exports.PasswordMismatchError = PasswordMismatchError;
class InvalidCredentialsError extends Error {
    code = "invalid_credentials";
    constructor() {
        super("Email or password is incorrect.");
        this.name = "InvalidCredentialsError";
    }
}
exports.InvalidCredentialsError = InvalidCredentialsError;
/**
 * Password sign-in attempted against a GOOGLE-ONLY account (the
 * legacy Google customers the ETL carries: google_sub set, password
 * hash NULL). This is NOT "wrong password" — there is no password on
 * the account to be wrong about, and telling the customer that sends
 * them into a reset flow that can never work. The honest, specific
 * answer: this account uses Google sign-in. (The login page renders
 * the dictionary copy for this code; this message is the API's text.)
 */
class GoogleOnlyAccountError extends Error {
    code = "google_signin_required";
    constructor() {
        super("This account uses Google sign-in — continue with Google instead of a password.");
        this.name = "GoogleOnlyAccountError";
    }
}
exports.GoogleOnlyAccountError = GoogleOnlyAccountError;
/**
 * A Google sign-in whose email matches an existing account but whose
 * email Google has NOT verified. Linking on an unverified email would
 * hand the account to whoever controls an unverified claim — refused,
 * honestly, with nothing linked and nothing created.
 */
class GoogleLinkRefusedError extends Error {
    code = "google_link_refused";
    constructor() {
        super("Google didn't verify that email address, so it can't be linked to the existing account. Sign in with your password instead.");
        this.name = "GoogleLinkRefusedError";
    }
}
exports.GoogleLinkRefusedError = GoogleLinkRefusedError;
/**
 * The OAuth callback's state didn't match the state cookie (or either
 * was missing). The flow stops here — a mismatched state is treated
 * as a forged or stale callback, never as a sign-in.
 */
class GoogleStateMismatchError extends Error {
    code = "google_state_mismatch";
    constructor() {
        super("The Google sign-in state did not match — the sign-in was not completed.");
        this.name = "GoogleStateMismatchError";
    }
}
exports.GoogleStateMismatchError = GoogleStateMismatchError;
function toPublicUser(user) {
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
function authResultFor(user) {
    return toAuthResult(user);
}
function toAuthResult(user) {
    return {
        token: (0, jwt_1.signToken)({ id: user.id, type: "driver" }),
        user: toPublicUser(user),
        quota: (0, quota_1.quotaStateFor)({ plan: user.plan, freeDiagnosesUsed: user.freeDiagnosesUsed }),
    };
}
async function registerDriver(store, input, deps = {}) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (name.length === 0 || name.length > 120) {
        throw new ValidationError('A non-empty "name" is required.');
    }
    const email = (0, identity_1.normalizeEmail)(input.email);
    if (!email)
        throw new ValidationError('A valid "email" is required.');
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
    let phone = null;
    let phoneNormalized = null;
    if (typeof input.phone === "string" && input.phone.trim().length > 0) {
        phoneNormalized = (0, identity_1.normalizePhone)(input.phone);
        if (!phoneNormalized) {
            throw new ValidationError('"phone" could not be read — include the full number.');
        }
        phone = input.phone.trim();
    }
    // Identity resolution BEFORE creation — email first, then phone.
    if (await store.findUserByEmail(email))
        throw new store_1.IdentityConflictError("email");
    if (phoneNormalized && (await store.findUserByPhone(phoneNormalized))) {
        throw new store_1.IdentityConflictError("phone");
    }
    const passwordHash = await (0, passwords_1.hashPassword)(password);
    const user = await store.createUser({
        name,
        email,
        phone,
        phoneNormalized,
        passwordHash,
        authMethod: "email",
    });
    // Code-first sign-up (0013): the visitor already proved control of
    // this inbox with a code BEFORE the account existed, so the account
    // is created already verified — stamping it is earned, and NO
    // verification email is sent (there is nothing left to verify).
    if (deps.emailPreVerified) {
        await store.markEmailVerified(user.id);
        const stamped = await store.findUserById(user.id);
        return toAuthResult(stamped ?? user);
    }
    const result = toAuthResult(user);
    // Verification code (0011) — issued + emailed best-effort. A mail
    // failure NEVER fails the registration: the account works from this
    // moment (soft gate), the code exists server-side, and the dashboard
    // banner offers a resend. The delivery state rides on the result so
    // the API can state it honestly.
    try {
        const sent = await (0, accountCodes_1.sendVerificationCode)(store, deps.mailer ?? (0, mailer_1.getMailer)(), user);
        result.verificationDelivery = sent.delivery;
    }
    catch {
        result.verificationDelivery = "failed";
    }
    return result;
}
// Timing equalization (security pass): when the account does not exist
// (or has no password hash), login still runs one bcrypt compare against
// a dummy hash, so the response time does not reveal whether the email
// is registered. The error is already identical on every failure path.
let dummyHashPromise = null;
function dummyHash() {
    if (!dummyHashPromise) {
        dummyHashPromise = (0, passwords_1.hashPassword)("mecha-timing-equalization-dummy");
    }
    return dummyHashPromise;
}
async function loginDriver(store, input) {
    const email = (0, identity_1.normalizeEmail)(input.email);
    const password = typeof input.password === "string" ? input.password : "";
    if (!email || password.length === 0)
        throw new InvalidCredentialsError();
    const user = await store.findUserByEmail(email);
    const ok = await (0, passwords_1.verifyPassword)(password, user?.passwordHash ?? (await dummyHash()));
    if (!user)
        throw new InvalidCredentialsError();
    // Google-only account (hash NULL): the honest, specific error — the
    // timing-equalized compare above already ran, so this reveal costs
    // no timing signal beyond what the account type requires.
    if (!user.passwordHash)
        throw new GoogleOnlyAccountError();
    if (!ok)
        throw new InvalidCredentialsError();
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
//       it), phone NULL. The phone is optional profile data (owner's
//       rules, 2026-11-16): the account alone is the diagnosis
//       requirement and the free count keys on the account, so a
//       phone-less Google account diagnoses immediately; the number
//       can still be added later (completePhone + the dashboard card).
// ---------------------------------------------------------------------------
async function resolveGoogleAccount(store, claims) {
    // (a) The Google identity itself.
    const bySub = await store.findUserByGoogleSub(claims.sub);
    if (bySub)
        return toAuthResult(bySub);
    const email = (0, identity_1.normalizeEmail)(claims.email);
    if (!email)
        throw new googleAuth_1.GoogleTokenVerificationError();
    // (b) Link by verified email.
    const byEmail = await store.findUserByEmail(email);
    if (byEmail) {
        if (!claims.emailVerified)
            throw new GoogleLinkRefusedError();
        const linked = await store.linkGoogleAccount(byEmail.id, claims.sub);
        return toAuthResult(linked ?? byEmail);
    }
    // (c) A new driver account from the Google profile.
    const name = claims.name.trim().length > 0 ? claims.name.trim().slice(0, 120) : email.split("@")[0];
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
/**
 * The callback's core, with the state check FIRST (a mismatch stops
 * everything — no exchange, no verification, no account work), then
 * the code exchange, then ID-token verification through the injected
 * verifier, then account resolution. The route is a thin adapter over
 * this; tests drive it with the stub verifier + a stub exchange.
 */
async function completeGoogleSignIn(store, input, deps) {
    if (!input.code ||
        !input.state ||
        !input.expectedState ||
        input.state !== input.expectedState) {
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
async function completePhone(store, userId, input) {
    const user = await store.findUserById(userId);
    if (!user)
        throw new errors_1.NotFoundError("The signed-in account no longer exists.");
    const phoneNormalized = (0, identity_1.normalizePhone)(input.phone);
    if (!phoneNormalized) {
        throw new ValidationError('"phone" could not be read — include the full number.');
    }
    const existing = await store.findUserByPhone(phoneNormalized);
    if (existing && existing.id !== userId)
        throw new store_1.IdentityConflictError("phone");
    const updated = await store.updateUserPhone(userId, typeof input.phone === "string" ? input.phone.trim() : phoneNormalized, phoneNormalized);
    return toAuthResult(updated ?? user);
}
function publicUser(user) {
    return toPublicUser(user);
}
function quotaOf(user) {
    return (0, quota_1.quotaStateFor)({ plan: user.plan, freeDiagnosesUsed: user.freeDiagnosesUsed });
}
