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
