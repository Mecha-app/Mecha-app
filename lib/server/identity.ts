/**
 * Identity normalization (WP5) — the two keys an account identity is
 * recognized by, per the owner's hard rule: EMAIL and PHONE.
 *
 * Registration, login, and every re-registration attempt resolve through
 * these exact functions, so "same person, new signup form" can never
 * produce a second identity with a fresh free quota:
 *   - email: trimmed + lowercased (the DB also enforces lower(email)).
 *   - phone: reduced to a canonical E.164-ish form ("+1" + 10 digits for
 *     US numbers — the legacy product is US-first; international numbers
 *     keep their explicit country code). "(617) 555-0134", "617-555-0134"
 *     and "+1 617 555 0134" are the SAME identity key.
 */

function hasWhitespaceOrControl(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) <= 32) return true;
  }
  return false;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > 254) return null;
  if (hasWhitespaceOrControl(email)) return null;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return null;
  const domain = email.slice(at + 1);
  if (domain.length === 0 || !domain.includes(".")) return null;
  if (domain.startsWith(".") || domain.endsWith(".")) return null;
  return email;
}

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  // US numbers: 10 digits, or 11 with the leading country code 1.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Anything else must have been written with an explicit country code.
  if (trimmed.startsWith("+")) return `+${digits}`;
  return null;
}
