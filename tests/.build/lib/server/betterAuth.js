"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_CALLBACK_PATH = exports.BETTER_AUTH_BASE_PATH = void 0;
exports.betterAuthGoogleRedirectUri = betterAuthGoogleRedirectUri;
exports.isBetterAuthConfigured = isBetterAuthConfigured;
exports.isBetterAuthGoogleConfigured = isBetterAuthGoogleConfigured;
exports.buildBetterAuthOptions = buildBetterAuthOptions;
exports.getBetterAuth = getBetterAuth;
const better_auth_1 = require("better-auth");
const db_1 = require("./db");
const poolConfig_1 = require("./poolConfig");
const googleAuth_1 = require("./googleAuth");
const passwords_1 = require("./passwords");
const store_1 = require("./store");
const betterAuthLink_1 = require("./betterAuthLink");
/**
 * Better Auth (AUTH DECISION 2026-11-06; owner order, repeated
 * 2026-11-06 evening) — the customer auth engine that replaces the
 * hand-rolled JWT setup for DRIVER sign-up / sign-in:
 *
 *   - one-tap Google sign-in (social provider below),
 *   - email + password through Better Auth, with the app's EXISTING
 *     bcryptjs hash/verify plugged in, so every password hash the
 *     legacy backend and this rebuild have ever stored keeps working
 *     byte-for-byte (Better Auth's credential rows backfill from
 *     users.password_hash in migration 0014),
 *   - account LINKING with MECHA's rule, not the permissive one:
 *     implicit linking is enabled and an OAuth account links to an
 *     existing user ONLY when the provider has verified the email.
 *     Google is deliberately NOT in `trustedProviders` — a trusted
 *     provider links even on an UNVERIFIED email claim, which is
 *     exactly the handover the identity rule forbids
 *     (GoogleLinkRefusedError in authService is the same policy in
 *     the legacy flow).
 *
 * IDENTITY: Better Auth's user model IS the app `users` table
 * (modelName + field mapping below) — there is one identity row per
 * human, and the 5-free-diagnoses quota keeps keying off it
 * (email + phone). Better Auth's own tables are ba_account /
 * ba_session / ba_verification (migration 0014). Google-only legacy
 * users (google_sub set, password_hash NULL) sign in with Google and
 * land in their existing row: Better Auth links by verified email,
 * and the account-create hook then stamps users.google_sub /
 * auth_method / the verified stamp via the store's
 * linkGoogleAccount, so every legacy lookup keeps working.
 *
 * SESSIONS: Better Auth owns its cookie session for the sign-in
 * surface. The app shell still speaks the standard payload
 * ({token, user, quota}); GET /api/auth/session-bridge converts a
 * live Better Auth session into that payload, so nothing downstream
 * (quota gate, phone gate, billing) changes shape.
 *
 * UNWIRED DISCIPLINE (the rebuild's standing rule): when
 * DATABASE_URL or BETTER_AUTH_SECRET is absent, getBetterAuth()
 * returns null and the route answers an honest 501 — nothing is
 * fake-configured, and the legacy auth routes keep serving.
 */
exports.BETTER_AUTH_BASE_PATH = "/api/auth";
exports.GOOGLE_CALLBACK_PATH = `${exports.BETTER_AUTH_BASE_PATH}/callback/google`;
/** The redirect URI the Google Cloud OAuth client must carry. */
function betterAuthGoogleRedirectUri(baseUrl) {
    const base = (baseUrl ?? process.env.BETTER_AUTH_URL ?? process.env.CLIENT_URL ?? "")
        .trim()
        .replace(/\/+$/, "");
    return `${base}${exports.GOOGLE_CALLBACK_PATH}`;
}
function isBetterAuthConfigured() {
    const secret = process.env.BETTER_AUTH_SECRET;
    return (0, db_1.isDatabaseConfigured)() && typeof secret === "string" && secret.length > 0;
}
/** Google sign-in through Better Auth needs BOTH the engine and the
 * OAuth client env (the same GOOGLE_CLIENT_ID/SECRET pair the legacy
 * flow reads — one Google Cloud client serves both during staging). */
function isBetterAuthGoogleConfigured() {
    return isBetterAuthConfigured() && (0, googleAuth_1.isGoogleConfigured)();
}
/**
 * The options factory — exported pure so the test-suite can pin the
 * security-relevant shape (linking policy, model mapping, provider
 * gating) without a live database. `database` is the pg Pool in
 * production; callers pass nothing else.
 */
function buildBetterAuthOptions(database) {
    const google = (0, googleAuth_1.isGoogleConfigured)()
        ? {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
        }
        : {};
    return {
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL ?? process.env.CLIENT_URL,
        database,
        emailAndPassword: {
            enabled: true,
            // The app's own bcryptjs (cost from passwords.ts). Legacy and
            // rebuild hashes verify unchanged; new Better Auth credential
            // rows store bcrypt hashes in ba_account.password.
            password: {
                hash: (password) => (0, passwords_1.hashPassword)(password),
                verify: (data) => (0, passwords_1.verifyPassword)(data.password, data.hash),
            },
        },
        socialProviders: { ...google },
        user: {
            modelName: "users",
            fields: {
                emailVerified: "is_verified",
                image: "avatar",
                createdAt: "created_at",
                updatedAt: "updated_at",
            },
            additionalFields: {
                // Phone is an identity key (owner's rule): collectable at
                // email sign-up; Google-created accounts start phone-less and
                // the diagnoseService phone gate holds their diagnoses until
                // completePhone lands — unchanged.
                phone: { type: "string", required: false, input: true },
            },
        },
        account: {
            modelName: "ba_account",
            fields: {
                userId: "user_id",
                accountId: "account_id",
                providerId: "provider_id",
                accessToken: "access_token",
                refreshToken: "refresh_token",
                idToken: "id_token",
                accessTokenExpiresAt: "access_token_expires_at",
                refreshTokenExpiresAt: "refresh_token_expires_at",
                createdAt: "created_at",
                updatedAt: "updated_at",
            },
            accountLinking: {
                enabled: true,
                // Verified-email-only linking: NO trustedProviders on
                // purpose (see the module comment). allowDifferentEmails
                // stays off — a Google account claiming a different email
                // never rebinds an existing identity.
                allowDifferentEmails: false,
            },
        },
        session: {
            modelName: "ba_session",
            fields: {
                userId: "user_id",
                expiresAt: "expires_at",
                ipAddress: "ip_address",
                userAgent: "user_agent",
                createdAt: "created_at",
                updatedAt: "updated_at",
            },
        },
        verification: {
            modelName: "ba_verification",
            fields: {
                expiresAt: "expires_at",
                createdAt: "created_at",
                updatedAt: "updated_at",
            },
        },
        advanced: {
            database: {
                // users.id is a Postgres uuid PK (gen_random_uuid default);
                // Better Auth must mint uuids, not its default string ids.
                generateId: "uuid",
            },
        },
        databaseHooks: {
            account: {
                create: {
                    after: async (account) => {
                        // Keep the app's identity columns in sync with the
                        // Better Auth account row: users.google_sub is what the
                        // legacy lookups (and the ETL parity checks) read.
                        if (account.providerId === "google") {
                            await (0, betterAuthLink_1.applyGoogleAccountLink)((0, store_1.getIdentityStore)(), {
                                userId: account.userId,
                                googleSub: account.accountId,
                            });
                        }
                    },
                },
            },
        },
    };
}
let cachedAuth = null;
let cachedPool = null;
/** The live instance, or null when the environment is unwired. */
function getBetterAuth() {
    if (!isBetterAuthConfigured())
        return null;
    if (!cachedAuth) {
        cachedPool = (0, poolConfig_1.createDatabasePool)(process.env.DATABASE_URL);
        cachedAuth = (0, better_auth_1.betterAuth)(buildBetterAuthOptions(cachedPool));
    }
    return cachedAuth;
}
