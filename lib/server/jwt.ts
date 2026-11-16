import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session tokens (WP5) — JWT Bearer, HS256, 30 days, payload {id, type}.
 * Byte-for-byte the legacy contract (repo backend/src/routes/auth.js:
 * jwt.sign({id, type}, JWT_SECRET, {expiresIn: '30d'})), re-implemented
 * on node:crypto so the rebuild carries no extra dependency for it.
 * Tokens minted by the legacy backend verify here and vice versa.
 *
 * NOTE the payload intentionally carries NO email — the legacy bug where
 * create-checkout read req.user.email (absent → undefined) came from
 * assuming it did. Anything that needs the email reads the user RECORD.
 */

export type AccountType = "driver" | "shop" | "towing";

export interface TokenPayload {
  id: string;
  type: AccountType;
  iat: number;
  exp: number;
}

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export class AuthNotConfiguredError extends Error {
  readonly code = "auth_not_configured";
  constructor() {
    super("JWT_SECRET is not set — auth is not wired in this environment.");
    this.name = "AuthNotConfiguredError";
  }
}

export function isAuthConfigured(): boolean {
  return typeof process.env.JWT_SECRET === "string" && process.env.JWT_SECRET.length > 0;
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length === 0) throw new AuthNotConfiguredError();
  return s;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").split("+").join("-").split("/").join("_").split("=")[0];
}

function base64UrlDecode(s: string): Buffer {
  const b64 = s.split("-").join("+").split("_").join("/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function sign(data: string, key: string): string {
  return base64UrlEncode(createHmac("sha256", key).update(data).digest());
}

export function signToken(
  input: { id: string; type: AccountType },
  expiresInSeconds: number = THIRTY_DAYS_SECONDS,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8"));
  const payload = base64UrlEncode(
    Buffer.from(
      JSON.stringify({ id: input.id, type: input.type, iat: now, exp: now + expiresInSeconds }),
      "utf8",
    ),
  );
  const body = `${header}.${payload}`;
  return `${body}.${sign(body, secret())}`;
}

export function verifyToken(token: string): TokenPayload | null {
  if (!isAuthConfigured()) throw new AuthNotConfiguredError();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`, secret());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let parsed: Partial<TokenPayload>;
  try {
    parsed = JSON.parse(base64UrlDecode(payload).toString("utf8")) as Partial<TokenPayload>;
  } catch {
    return null;
  }
  if (typeof parsed.id !== "string" || typeof parsed.exp !== "number") return null;
  if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
  if (parsed.type !== "driver" && parsed.type !== "shop" && parsed.type !== "towing") return null;
  return parsed as TokenPayload;
}

/** Extract + verify the Bearer token from a request; null when absent/invalid. */
export function bearerPayload(request: Request): TokenPayload | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return verifyToken(token);
}
