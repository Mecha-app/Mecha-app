"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StubGoogleVerifier = exports.JwksGoogleVerifier = exports.GOOGLE_STATE_COOKIE = exports.GoogleExchangeError = exports.GoogleTokenVerificationError = exports.GoogleNotConfiguredError = void 0;
exports.isGoogleConfigured = isGoogleConfigured;
exports.googleRedirectUri = googleRedirectUri;
exports.newGoogleState = newGoogleState;
exports.buildGoogleAuthorizeUrl = buildGoogleAuthorizeUrl;
exports.exchangeGoogleCode = exchangeGoogleCode;
exports.getGoogleVerifier = getGoogleVerifier;
const node_crypto_1 = require("node:crypto");
/**
 * Google sign-in (social login package) — OAuth 2.0 authorization-code
 * flow for DRIVER accounts, following the rebuild's provider pattern:
 * an interface, the real Google implementation, and a stub for tests.
 *
 * ENV-GATED (owner wiring): GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 * (server-only — the secret never reaches the browser) turn the
 * feature on; the redirect base is CLIENT_URL, the same env the Stripe
 * return URLs use. Unconfigured → isGoogleConfigured() is false, the
 * login/register pages simply don't render the Google button (they ask
 * /api/auth/providers), and the routes answer an honest 501.
 *
 * The Google Cloud project itself is the OWNER's step: created later
 * under the MechaApp business identity (app.mechaai@gmail.com) — OAuth
 * consent screen + a Web client whose authorized redirect URI is
 * CLIENT_URL + /api/auth/google/callback. Apple sign-in is staged
 * behind the owner's Apple Developer account and is deliberately NOT
 * built here — no dead Apple button ships.
 *
 * WHY THIS PACKAGE IS LOAD-BEARING: the ETL carries legacy Google-only
 * customers (google_sub set, password_hash NULL). Without this flow
 * those migrated accounts can never sign in again.
 */
class GoogleNotConfiguredError extends Error {
    code = "google_not_configured";
    constructor() {
        super("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set — Google sign-in is not wired.");
        this.name = "GoogleNotConfiguredError";
    }
}
exports.GoogleNotConfiguredError = GoogleNotConfiguredError;
class GoogleTokenVerificationError extends Error {
    code = "google_token_invalid";
    constructor() {
        super("The Google ID token could not be verified.");
        this.name = "GoogleTokenVerificationError";
    }
}
exports.GoogleTokenVerificationError = GoogleTokenVerificationError;
class GoogleExchangeError extends Error {
    code = "google_exchange_failed";
    constructor() {
        super("The Google sign-in code could not be exchanged.");
        this.name = "GoogleExchangeError";
    }
}
exports.GoogleExchangeError = GoogleExchangeError;
/** Env is read at call time (the codebase pattern — tests toggle it). */
function isGoogleConfigured() {
    const id = process.env.GOOGLE_CLIENT_ID;
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    return typeof id === "string" && id.length > 0 && typeof secret === "string" && secret.length > 0;
}
function googleClientId() {
    const id = process.env.GOOGLE_CLIENT_ID;
    if (!id)
        throw new GoogleNotConfiguredError();
    return id;
}
function googleClientSecret() {
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    if (!secret)
        throw new GoogleNotConfiguredError();
    return secret;
}
/** The OAuth redirect URI registered with the Google Cloud project. */
function googleRedirectUri() {
    const base = (process.env.CLIENT_URL ?? "").replace(/\/+$/, "");
    return `${base}/api/auth/google/callback`;
}
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
/** A fresh, unguessable OAuth state value (CSRF binding for the flow). */
/**
 * The OAuth state cookie: set by /api/auth/google/start, verified and
 * cleared by the callback. httpOnly + SameSite=Lax, ten minutes.
 * (Lives here, not in the route file — Next route modules may only
 * export route handlers and route config.)
 */
exports.GOOGLE_STATE_COOKIE = "mecha_google_state";
function newGoogleState() {
    return (0, node_crypto_1.randomBytes)(32).toString("hex");
}
function buildGoogleAuthorizeUrl(state) {
    if (!isGoogleConfigured())
        throw new GoogleNotConfiguredError();
    const params = new URLSearchParams({
        client_id: googleClientId(),
        redirect_uri: googleRedirectUri(),
        response_type: "code",
        scope: "openid email profile",
        state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
}
/**
 * Exchange the authorization code for tokens, server-side (the client
 * secret rides only on this call). Returns the ID token; every failure
 * is the one typed error — Google's response body is never surfaced.
 */
async function exchangeGoogleCode(code) {
    if (!isGoogleConfigured())
        throw new GoogleNotConfiguredError();
    let res;
    try {
        res = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: googleClientId(),
                client_secret: googleClientSecret(),
                redirect_uri: googleRedirectUri(),
                grant_type: "authorization_code",
            }).toString(),
        });
    }
    catch {
        throw new GoogleExchangeError();
    }
    if (!res.ok)
        throw new GoogleExchangeError();
    const data = (await res.json().catch(() => null));
    if (!data || typeof data.id_token !== "string" || data.id_token.length === 0) {
        throw new GoogleExchangeError();
    }
    return data.id_token;
}
function base64UrlDecode(s) {
    const b64 = s.split("-").join("+").split("_").join("/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return Buffer.from(padded, "base64");
}
const JWKS_CACHE_MS = 5 * 60 * 1000;
let jwksCache = null;
async function fetchGoogleJwks() {
    const now = Date.now();
    if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_MS)
        return { keys: jwksCache.keys };
    const res = await fetch(JWKS_URL);
    if (!res.ok)
        throw new GoogleTokenVerificationError();
    const data = (await res.json().catch(() => null));
    if (!data || !Array.isArray(data.keys))
        throw new GoogleTokenVerificationError();
    jwksCache = { keys: data.keys, fetchedAt: now };
    return { keys: data.keys };
}
/**
 * The real verifier — RS256 signature against Google's JWKS (fetched
 * from googleapis.com, cached briefly; an unknown kid forces one
 * refetch, which is how key rotation is absorbed), then the claim
 * checks every relying party owes: issuer, audience = OUR client id,
 * and expiry. Implemented on node:crypto — no new dependency.
 */
class JwksGoogleVerifier {
    deps;
    constructor(deps = {}) {
        this.deps = deps;
    }
    clientId() {
        return this.deps.clientId ?? googleClientId();
    }
    async keyFor(kid) {
        const fetchJwks = this.deps.fetchJwks ?? fetchGoogleJwks;
        let { keys } = await fetchJwks();
        let match = keys.find((k) => k.kid === kid) ?? null;
        if (!match && !this.deps.fetchJwks) {
            // Key rotation: bypass the cache once and look again.
            jwksCache = null;
            ({ keys } = await fetchGoogleJwks());
            match = keys.find((k) => k.kid === kid) ?? null;
        }
        return match;
    }
    async verifyIdToken(idToken) {
        const parts = idToken.split(".");
        if (parts.length !== 3)
            throw new GoogleTokenVerificationError();
        const [headerPart, payloadPart, signaturePart] = parts;
        let header;
        let payload;
        try {
            header = JSON.parse(base64UrlDecode(headerPart).toString("utf8"));
            payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8"));
        }
        catch {
            throw new GoogleTokenVerificationError();
        }
        if (header.alg !== "RS256" || typeof header.kid !== "string") {
            throw new GoogleTokenVerificationError();
        }
        const jwk = await this.keyFor(header.kid);
        if (!jwk)
            throw new GoogleTokenVerificationError();
        let signatureOk = false;
        try {
            const key = (0, node_crypto_1.createPublicKey)({ key: jwk, format: "jwk" });
            signatureOk = (0, node_crypto_1.verify)("RSA-SHA256", Buffer.from(`${headerPart}.${payloadPart}`, "utf8"), key, base64UrlDecode(signaturePart));
        }
        catch {
            throw new GoogleTokenVerificationError();
        }
        if (!signatureOk)
            throw new GoogleTokenVerificationError();
        const now = this.deps.nowSeconds
            ? this.deps.nowSeconds()
            : Math.floor(Date.now() / 1000);
        if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
            throw new GoogleTokenVerificationError();
        }
        if (payload.aud !== this.clientId())
            throw new GoogleTokenVerificationError();
        if (typeof payload.exp !== "number" || payload.exp <= now) {
            throw new GoogleTokenVerificationError();
        }
        if (typeof payload.sub !== "string" || payload.sub.length === 0) {
            throw new GoogleTokenVerificationError();
        }
        if (typeof payload.email !== "string" || payload.email.length === 0) {
            throw new GoogleTokenVerificationError();
        }
        return {
            sub: payload.sub,
            email: payload.email,
            emailVerified: payload.email_verified === true,
            name: typeof payload.name === "string" ? payload.name : "",
        };
    }
}
exports.JwksGoogleVerifier = JwksGoogleVerifier;
/**
 * Recording stub — tests only. Hands back the claims it was built with
 * (or throws the error it was built with) and remembers every token it
 * was asked to verify. Never touches the network.
 */
class StubGoogleVerifier {
    outcome;
    calls = [];
    constructor(outcome) {
        this.outcome = outcome;
    }
    async verifyIdToken(idToken) {
        this.calls.push(idToken);
        if (this.outcome instanceof Error)
            throw this.outcome;
        return this.outcome;
    }
}
exports.StubGoogleVerifier = StubGoogleVerifier;
/** The production verifier, or null when Google sign-in is unwired. */
function getGoogleVerifier() {
    return isGoogleConfigured() ? new JwksGoogleVerifier() : null;
}
