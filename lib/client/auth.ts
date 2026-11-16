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

export function saveSession(token: string, user: StoredUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable (private mode) — the session simply won't persist.
  }
}

export function getToken(): string | null {
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
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}
