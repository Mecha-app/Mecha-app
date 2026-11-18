"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitlistStore = exports.DatabaseNotConfiguredError = void 0;
exports.isDatabaseConfigured = isDatabaseConfigured;
exports.buildParameterizedQuery = buildParameterizedQuery;
exports.getSql = getSql;
exports.saveDiagnosis = saveDiagnosis;
const poolConfig_1 = require("./poolConfig");
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
 * (port 5432) after the owner's cutover. Pools are built by
 * lib/server/poolConfig.ts, which configures TLS explicitly for
 * Supabase hosts (2026-11-15 cutover fix — see that module). The exported surface
 * (getSql / waitlistStore / saveDiagnosis) is unchanged: getSql() still
 * returns a tagged-template function, implemented here by translating
 * the template into a parameterized pg query ($1…$n), so the queries
 * below read exactly as they did under the Neon driver.
 */
class DatabaseNotConfiguredError extends Error {
    code = "database_not_configured";
    constructor() {
        super("DATABASE_URL is not set — persistence is not wired in this environment.");
        this.name = "DatabaseNotConfiguredError";
    }
}
exports.DatabaseNotConfiguredError = DatabaseNotConfiguredError;
function isDatabaseConfigured() {
    return typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim().length > 0;
}
let cachedPool = null;
function getPool() {
    const url = process.env.DATABASE_URL;
    if (!url || url.trim().length === 0)
        throw new DatabaseNotConfiguredError();
    if (!cachedPool)
        cachedPool = (0, poolConfig_1.createDatabasePool)(url);
    return cachedPool;
}
/**
 * Translate a tagged template into pg's parameterized form:
 * (`SELECT ${a}, ${b}`) → text "SELECT $1, $2", params [a, b].
 * Pure and exported for the test-suite.
 */
function buildParameterizedQuery(strings, values) {
    const text = strings.reduce((acc, part, i) => (i === 0 ? part : `${acc}$${i}${part}`), "");
    return { text, params: values };
}
let cachedSql = null;
function getSql() {
    const pool = getPool();
    if (!cachedSql) {
        cachedSql = async (strings, ...values) => {
            const { text, params } = buildParameterizedQuery(strings, values);
            const result = await pool.query(text, params);
            return result.rows;
        };
    }
    return cachedSql;
}
/** pg returns timestamptz as Date; the Neon driver returned strings. Normalize. */
function asIsoTimestamp(value) {
    return value instanceof Date ? value.toISOString() : String(value);
}
exports.waitlistStore = {
    async addSignup({ email, source = "homepage", locale }) {
        const sql = getSql();
        const inserted = await sql `
      INSERT INTO waitlist_signups (email, source, locale)
      VALUES (${email}, ${source}, ${locale ?? null})
      ON CONFLICT (lower(email)) DO NOTHING
      RETURNING id, email, created_at
    `;
        if (inserted.length > 0) {
            const row = inserted[0];
            return { id: row.id, email: row.email, createdAt: asIsoTimestamp(row.created_at), duplicate: false };
        }
        const existing = await sql `
      SELECT id, email, created_at FROM waitlist_signups
      WHERE lower(email) = lower(${email}) LIMIT 1
    `;
        const row = existing[0];
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
async function saveDiagnosis(input) {
    const sql = getSql();
    const rows = await sql `
    INSERT INTO diagnostics (user_id, vehicle_id, problem_text, image_url, ai_result)
    VALUES (
      ${input.userId}, ${input.vehicleId},
      ${input.problemText ?? null}, ${input.imageUrl ?? null},
      ${JSON.stringify(input.aiResult)}::jsonb
    )
    RETURNING id
  `;
    return { id: rows[0].id };
}
