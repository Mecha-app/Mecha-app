import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Persistence layer (WP3 groundwork, Migration V2 Phase C).
 *
 * The interface is real; the Neon implementation sits behind an env check.
 * When DATABASE_URL is absent this module says so honestly
 * (DatabaseNotConfiguredError / isDatabaseConfigured() === false) and every
 * caller degrades to the WP2-style 501 — nothing is ever fake-stored.
 *
 * At Phase B the Neon project is created via Google SSO as
 * app.mechaai@gmail.com and DATABASE_URL lands in the Vercel env; no code
 * changes are needed here when that happens.
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

type Sql = NeonQueryFunction<false, false>;

let cachedSql: Sql | null = null;

export function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim().length === 0) throw new DatabaseNotConfiguredError();
  if (!cachedSql) cachedSql = neon(url);
  return cachedSql;
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
      const row = inserted[0] as { id: string; email: string; created_at: string };
      return { id: row.id, email: row.email, createdAt: row.created_at, duplicate: false };
    }
    const existing = await sql`
      SELECT id, email, created_at FROM waitlist_signups
      WHERE lower(email) = lower(${email}) LIMIT 1
    `;
    const row = existing[0] as { id: string; email: string; created_at: string };
    return { id: row.id, email: row.email, createdAt: row.created_at, duplicate: true };
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
