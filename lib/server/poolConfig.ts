import { Pool, type PoolConfig } from "pg";

/**
 * The ONE place DATABASE_URL becomes a pg Pool (db.ts, store.ts,
 * appStore.ts and betterAuth.ts all build their pools here).
 *
 * WHY SUPABASE HOSTS GET AN EXPLICIT CONFIG (cutover blocker,
 * 2026-11-15): pg 8.23 ships pg-connection-string 2.14, whose default
 * (non-libpq) parsing turns `sslmode=require` — the exact string both
 * Supabase and Neon hand out — into `ssl: {}`. An empty ssl object
 * means Node's tls defaults apply: the server certificate is verified
 * against Node's bundled public CA store. Neon's endpoint presents a
 * publicly-chained certificate, so Neon kept working unchanged.
 * Supabase's Postgres endpoints (direct db.<ref>.supabase.co and the
 * Supavisor pooler) present a certificate chained to Supabase's own
 * root CA, which is NOT in Node's public bundle — so the handshake
 * aborts on the client side before authentication is ever attempted.
 * Supabase's own Postgres logs from the failed cutover show exactly
 * that signature: TCP connections arrive, then die in the TLS/startup
 * exchange with zero authentication attempts.
 *
 * The fix therefore does not trust the connection string's sslmode at
 * all for Supabase hosts: the URL is taken apart here and the Pool is
 * configured field-by-field with SSL on and chain verification off
 * (the encrypted channel is still mandatory — `ssl` is always set —
 * and this matches Supabase's documented Node/pg guidance; it can be
 * upgraded to full verification later by supplying Supabase's CA
 * certificate). Every other host — Neon included — keeps the previous
 * behavior byte-for-byte: the raw connection string, parsed by pg
 * exactly as before.
 */

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Supabase Postgres endpoints: the direct host and Supavisor pooler. */
export function isSupabaseHost(hostname: string): boolean {
  return hostname.endsWith(".supabase.co") || hostname.endsWith(".pooler.supabase.com");
}

/**
 * Pure and exported for the test-suite: DATABASE_URL → PoolConfig.
 * Non-Supabase URLs (and anything unparseable) pass through untouched.
 */
export function buildPoolConfig(connectionString: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return { connectionString };
  }
  if (!isSupabaseHost(url.hostname)) return { connectionString };
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodePart(url.username),
    password: decodePart(url.password),
    database: url.pathname.replace(/^\//, "") || "postgres",
    // See the module comment: SSL required, chain verification off —
    // Supabase's private root CA is not in Node's public bundle.
    ssl: { rejectUnauthorized: false },
    // Fail a dead connection loudly in seconds instead of hanging the
    // function until the platform timeout.
    connectionTimeoutMillis: 10_000,
  };
}

/**
 * Sanitized server-side error logging: name, message and SQLSTATE /
 * errno code only. NEVER the error object itself and never the
 * connection string — a driver error must not be able to carry the
 * database password into the logs.
 */
export function logDatabaseError(context: string, err: unknown): void {
  const e = (err ?? {}) as { name?: unknown; message?: unknown; code?: unknown };
  console.error(`[db] ${context}`, {
    name: typeof e.name === "string" ? e.name : "Error",
    message: typeof e.message === "string" ? e.message : String(err),
    code: typeof e.code === "string" || typeof e.code === "number" ? e.code : undefined,
  });
}

/** Build a Pool with the shared config + an idle-client error logger
 * (an unhandled pool 'error' event would otherwise take the whole
 * serverless function down with no trace of the cause). */
export function createDatabasePool(connectionString: string): Pool {
  const pool = new Pool(buildPoolConfig(connectionString));
  pool.on("error", (err) => logDatabaseError("pool idle client error", err));
  return pool;
}
