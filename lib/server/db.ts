import { Pool } from "pg";

/**
 * Persistence layer (WP3 groundwork, Migration V2 Phase C).
 *
 * The interface is real; the Postgres implementation sits behind an env
 * check. When DATABASE_URL is absent this module says so honestly
 * (DatabaseNotConfiguredError / isDatabaseConfigured() === false) and every
 * caller degrades to the WP2-style 501 — nothing is ever fake-stored.
 *
 * DRIVER (Supabase migration, 2026-11-14): this module originally ran on
 * the Neon serverless HTTP driver, which can only talk to Neon's proxy
 * endpoint. It now uses the standard `pg` Pool — the same pattern as
 * lib/server/store.ts and lib/server/appStore.ts — so DATABASE_URL can
 * point at ANY Postgres, including the Supabase direct connection
 * (port 5432) after the owner's cutover. The exported surface
 * (getSql / waitlistStore / saveDiagnosis) is unchanged: getSql() still
 * returns a tagged-template function, implemented here by translating
 * the template into a parameterized pg query ($1…$n), so the queries
 * below read exactly as they did under the Neon driver.
 */

export class DatabaseNotConfiguredError extends Error {
  readonly code = "database_not_configured";
  constructor() {
    super("DATABASE_URL is not set — persistence is not wired in this environment.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function isDatabaseConfigured(): boolean {
  return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}

/**
 * A tagged-template SQL function: sql`SELECT … WHERE x = ${value}`
 * runs a parameterized query and resolves to the result rows.
 * (The shape the Neon driver exposed; kept so callers don't change.)
 */
export type SqlTag = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Array<Record<string, unknown>>>;

let cachedPool: Pool | null = null;

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) throw new DatabaseNotConfiguredError();
  if (!cachedPool) cachedPool = new Pool({ connectionString: url });
  return cachedPool;
}

/**
 * Translate a tagged template into pg's parameterized form:
 * (`SELECT ${a}, ${b}`) → text "SELECT $1, $2", params [a, b].
 * Pure and exported for the test-suite.
 */
export function buildParameterizedQuery(
  strings: ReadonlyArray<string>,
  values: unknown[],
): { text: string; params: unknown[] } {
  const text = strings.reduce((acc, part, i) => (i === 0 ? part : `${acc}$${i}${part}`), "");
  return { text, params: values };
}

let cachedSql: SqlTag | null = null;

export function getSql(): SqlTag {
  const pool = getPool();
  if (!cachedSql) {
    cachedSql = async (strings, ...values) => {
      const { text, params } = buildParameterizedQuery(strings, values);
      const result = await pool.query(text, params);
      return result.rows as Array<Record<string, unknown>>;
    };
  }
  return cachedSql;
}

/** pg returns timestamptz as Date; the Neon driver returned strings. Normalize. */
function asIsoTimestamp(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

// ---------------------------------------------------------------------------
// Waitlist (db/migrations/0002 — waitlist_signups)
// ---------------------------------------------------------------------------

export interface WaitlistSignupResult {
  id: string;
  email: string;
  createdAt: string;
  duplicate: boolean;
}

export interface WaitlistStore {
  addSignup(input: { email: string; source?: string; locale?: string }): Promise<WaitlistSignupResult>;
}

export const waitlistStore: WaitlistStore = {
  async addSignup({ email, source = "homepage", locale }) {
    const sql = getSql();
    const inserted = await sql`
      INSERT INTO waitlist_signups (email, source, locale)
      VALUES (${email}, ${source}, ${locale ?? null})
      ON CONFLICT (lower(email)) DO NOTHING
      RETURNING id, email, created_at
    `;
    if (inserted.length > 0) {
      const row = inserted[0] as { id: string; email: string; created_at: unknown };
      return { id: row.id, email: row.email, createdAt: asIsoTimestamp(row.created_at), duplicate: false };
    }
    const existing = await sql`
      SELECT id, email, created_at FROM waitlist_signups
      WHERE lower(email) = lower(${email}) LIMIT 1
    `;
    const row = existing[0] as { id: string; email: string; created_at: unknown };
    return { id: row.id, email: row.email, createdAt: asIsoTimestamp(row.created_at), duplicate: true };
  },
};

// ---------------------------------------------------------------------------
// Diagnoses (db/migrations/0004 — diagnostics)
// Repo save shape (routes/diagnoses.js POST /): { vehicleId, problemText,
// aiResult } + the uploaded image path, owned by the session user. Called
// by the authenticated app flows at WP5 — the anonymous public route
// deliberately does NOT write here: there is no session yet to own the row.
//
// NOTE (reconciliation 2026-11-03): an earlier draft of this module had a
// fault-code+vehicle answer cache. The repo's diagnoses carry NO fault
// codes — input is free problem text — so that cache key cannot be
// grounded in real data and the lookup was removed. Caching returns only
// if the WP5 Scan flow produces structured codes as new data.
// ---------------------------------------------------------------------------

export async function saveDiagnosis(input: {
  userId: string;
  vehicleId: string; // required by the repo model (Diagnosis.vehicle)
  problemText?: string;
  imageUrl?: string;
  aiResult: unknown; // the /ai response shape, stored whole (JSONB)
}): Promise<{ id: string }> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO diagnostics (user_id, vehicle_id, problem_text, image_url, ai_result)
    VALUES (
      ${input.userId}, ${input.vehicleId},
      ${input.problemText ?? null}, ${input.imageUrl ?? null},
      ${JSON.stringify(input.aiResult)}::jsonb
    )
    RETURNING id
  `;
  return { id: (rows[0] as { id: string }).id };
}
