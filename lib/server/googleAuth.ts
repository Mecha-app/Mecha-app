import { createPublicKey, randomBytes, verify as cryptoVerify } from "node:crypto";

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

export class GoogleNotConfiguredError extends Error {
  readonly code = "google_not_configured";
  constructor() {
    super("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set — Google sign-in is not wired.");
    this.name = "GoogleNotConfiguredError";
  }
}

export class GoogleTokenVerificationError extends Error {
  readonly code = "google_token_invalid";
  constructor() {
    super("The Google ID token could not be verified.");
    this.name = "GoogleTokenVerificationError";
  }
}

export class GoogleExchangeError extends Error {
  readonly code = "google_exchange_failed";
  constructor() {
    super("The Google sign-in code could not be exchanged.");
    this.name = "GoogleExchangeError";
  }
}

/** Env is read at call time (the codebase pattern — tests toggle it). */
export function isGoogleConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return typeof id === "string" && id.length > 0 && typeof secret === "string" && secret.length > 0;
}

function googleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new GoogleNotConfiguredError();
  return id;
}

function googleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new GoogleNotConfiguredError();
  return secret;
}

/** The OAuth redirect URI registered with the Google Cloud project. */
export function googleRedirectUri(): string {
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
export const GOOGLE_STATE_COOKIE = "mecha_google_state";

export function newGoogleState(): string {
  return randomBytes(32).toString("hex");
}

export function buildGoogleAuthorizeUrl(state: string): string {
  if (!isGoogleConfigured()) throw new GoogleNotConfiguredError();
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
export async function exchangeGoogleCode(code: string): Promise<string> {
  if (!isGoogleConfigured()) throw new GoogleNotConfiguredError();
  let res: Response;
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
  } catch {
    throw new GoogleExchangeError();
  }
  if (!res.ok) throw new GoogleExchangeError();
  const data = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
  if (!data || typeof data.id_token !== "string" || data.id_token.length === 0) {
    throw new GoogleExchangeError();
  }
  return data.id_token;
}

// ---------------------------------------------------------------------------
// ID-token verification
// ---------------------------------------------------------------------------

export interface GoogleIdTokenClaims {
  /** Google's stable subject id — the account's google_sub identity. */
  sub: string;
  email: string;
  /** Google's own email-verification assertion (linking requires it). */
  emailVerified: boolean;
  name: string;
}

export interface GoogleTokenVerifier {
  verifyIdToken(idToken: string): Promise<GoogleIdTokenClaims>;
}

interface Jwk {
  kid?: string;
  kty?: string;
  [key: string]: unknown;
}

function base64UrlDecode(s: string): Buffer {
  const b64 = s.split("-").join("+").split("_").join("/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export interface JwksVerifierDeps {
  clientId?: string;
  /** Injectable for tests; defaults to a fetch of Google's certs. */
  fetchJwks?: () => Promise<{ keys: Jwk[] }>;
  /** Injectable clock (seconds) for tests. */
  nowSeconds?: () => number;
}

const JWKS_CACHE_MS = 5 * 60 * 1000;
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

async function fetchGoogleJwks(): Promise<{ keys: Jwk[] }> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_MS) return { keys: jwksCache.keys };
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new GoogleTokenVerificationError();
  const data = (await res.json().catch(() => null)) as { keys?: Jwk[] } | null;
  if (!data || !Array.isArray(data.keys)) throw new GoogleTokenVerificationError();
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
export class JwksGoogleVerifier implements GoogleTokenVerifier {
  private readonly deps: JwksVerifierDeps;

  constructor(deps: JwksVerifierDeps = {}) {
    this.deps = deps;
  }

  private clientId(): string {
    return this.deps.clientId ?? googleClientId();
  }

  private async keyFor(kid: string): Promise<Jwk | null> {
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

  async verifyIdToken(idToken: string): Promise<GoogleIdTokenClaims> {
    const parts = idToken.split(".");
    if (parts.length !== 3) throw new GoogleTokenVerificationError();
    const [headerPart, payloadPart, signaturePart] = parts;
    let header: { alg?: unknown; kid?: unknown };
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(base64UrlDecode(headerPart).toString("utf8")) as typeof header;
      payload = JSON.parse(base64UrlDecode(payloadPart).toString("utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      throw new GoogleTokenVerificationError();
    }
    if (header.alg !== "RS256" || typeof header.kid !== "string") {
      throw new GoogleTokenVerificationError();
    }
    const jwk = await this.keyFor(header.kid);
    if (!jwk) throw new GoogleTokenVerificationError();
    let signatureOk = false;
    try {
      const key = createPublicKey({ key: jwk as never, format: "jwk" });
      signatureOk = cryptoVerify(
        "RSA-SHA256",
        Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
        key,
        base64UrlDecode(signaturePart),
      );
    } catch {
      throw new GoogleTokenVerificationError();
    }
    if (!signatureOk) throw new GoogleTokenVerificationError();

    const now = this.deps.nowSeconds
      ? this.deps.nowSeconds()
      : Math.floor(Date.now() / 1000);
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
      throw new GoogleTokenVerificationError();
    }
    if (payload.aud !== this.clientId()) throw new GoogleTokenVerificationError();
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

/**
 * Recording stub — tests only. Hands back the claims it was built with
 * (or throws the error it was built with) and remembers every token it
 * was asked to verify. Never touches the network.
 */
export class StubGoogleVerifier implements GoogleTokenVerifier {
  readonly calls: string[] = [];

  constructor(
    private readonly outcome: GoogleIdTokenClaims | Error,
  ) {}

  async verifyIdToken(idToken: string): Promise<GoogleIdTokenClaims> {
    this.calls.push(idToken);
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

/** The production verifier, or null when Google sign-in is unwired. */
export function getGoogleVerifier(): GoogleTokenVerifier | null {
  return isGoogleConfigured() ? new JwksGoogleVerifier() : null;
}
