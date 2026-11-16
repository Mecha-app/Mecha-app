/**
 * Client auth helpers (WP5) — the legacy storage contract, kept:
 * localStorage keys `mechaToken` + `mechaUser` (repo AuthContext).
 *
 * IMPORTANT: the browser holds ONLY the session token and the public
 * profile. The free-diagnosis count is NEVER stored client-side — the
 * legacy app kept a localStorage counter (mechaCount) that reset
 * monthly in the browser, one of the two reasons the old quota leaked.
 * The countdown always comes from the server (/api/auth/me, and the
 * quota events on the diagnosis stream).
 *
 * TOKEN STORAGE DECISION (security pass, 2026-11-03 — explicit):
 * the session JWT lives in localStorage and is sent ONLY as an
 * Authorization: Bearer header on same-origin /api/* calls made by
 * this module's consumers. Rationale for keeping the legacy contract:
 * (1) byte-compatibility with the legacy backend — tokens minted
 * there verify here and vice versa, which the cutover plan depends
 * on; (2) the payload is minimal ({id, type} + iat/exp — NO email,
 * NO secrets, nothing an inspector could reuse beyond the session
 * itself); (3) no server secret of any kind is ever present in the
 * browser — the Anthropic/Stripe/DB/JWT-signing secrets exist only
 * in server env, verified by the bundle audit in STATUS.md.
 * RESIDUAL RISK, stated plainly: a localStorage token is readable by
 * any script running on the origin, so XSS would equal session theft.
 * Mitigations in place: React's default output escaping, exactly one
 * inline script in the app (the static theme bootstrap — a constant
 * string with no interpolation), and the Content-Security-Policy in
 * next.config.mjs (default-src 'self'). RECOMMENDED FUTURE MOVE
 * (Edison/owner call at cutover, not silently changed here): migrate
 * to an httpOnly + Secure + SameSite=Lax cookie session, accepting
 * the break from the legacy Bearer contract once the legacy backend
 * is retired.
 *
 * SESSION PERSISTENCE FIX (2026-11-16, owner report: "Sign up and
 * sign in, they don't work… it says you sign up but you never get
 * inside the account"): localStorage alone did NOT survive on the
 * owner's phone — mobile Safari / in-app webview storage drops
 * around the sign-in round-trips (the Google OAuth trip above
 * all) — so every door completed, landed in the app, and the
 * guard found no token and bounced back to /login. A loop.
 * The session is now carried FIRST by the first-party cookie
 * `mecha_session` (lib/server/sessionCookie.ts): set by the
 * server on every auth completion response — and for Google, on
 * the top-level navigation redirect from
 * /api/auth/google/establish — with Path=/, Secure, SameSite=Lax.
 * getToken() reads the cookie FIRST and localStorage second;
 * saveSession mirrors the cookie client-side as well, so no door
 * depends on a single storage surviving. The cookie is not
 * httpOnly by design: the client guards must read it (the
 * exposure class is the localStorage token's own — a minimal
 * {id, type} payload behind the CSP); the httpOnly migration
 * above remains the future hardening for when the guards move
 * server-side.
 */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  type: string;
}

const TOKEN_KEY = "mechaToken";
const USER_KEY = "mechaUser";

/** Must match lib/server/sessionCookie.ts — the first-party cookie
 * that carries the session (the source of truth since 2026-11-16). */
const SESSION_COOKIE = "mecha_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function readSessionCookie(): string | null {
  try {
    for (const part of document.cookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      if (part.slice(0, eq).trim() === SESSION_COOKIE) {
        const value = part.slice(eq + 1).trim();
        return value.length > 0 ? value : null;
      }
    }
  } catch {
    // No document (SSR) or cookies blocked — fall through to storage.
  }
  return null;
}

function writeSessionCookie(token: string): void {
  try {
    document.cookie =
      `${SESSION_COOKIE}=${token}; Path=/; ` +
      `Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}; Secure; SameSite=Lax`;
  } catch {
    // Cookies unavailable — the server-set cookie and localStorage remain.
  }
}

function expireSessionCookie(): void {
  try {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
  } catch {
    // Nothing to expire.
  }
}

export function saveSession(token: string, user: StoredUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable (private mode) — the cookie still persists.
  }
  // Mirror the session into the first-party cookie as well: the
  // server sets it on the completion response, and this write
  // covers any door whose response cookie a webview dropped.
  writeSessionCookie(token);
}

export function getToken(): string | null {
  // The cookie is the source of truth (2026-11-16): it is what
  // survives reloads and in-app navigation on mobile browsers.
  const cookieToken = readSessionCookie();
  if (cookieToken) return cookieToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Nothing to clear.
  }
  // The cookie is the source of truth — a sign-out (or a 401) must
  // retire it too, or the guard would resurrect the dead session.
  expireSessionCookie();
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}
