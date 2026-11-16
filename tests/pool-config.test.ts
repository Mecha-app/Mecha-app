/**
 * poolConfig tests (Supabase cutover fix, 2026-11-15).
 *
 * pg 8.23's bundled pg-connection-string 2.14 parses `sslmode=require`
 * into `ssl: {}` — Node's tls defaults, i.e. certificate verification
 * against the public CA bundle. Supabase's Postgres endpoints present
 * a certificate chained to Supabase's private root CA, so every
 * Vercel→Supabase connection died inside the TLS handshake while the
 * same build on Neon (publicly-chained cert) worked. buildPoolConfig
 * is the fix: Supabase hosts get an explicit field-by-field config
 * with SSL on and chain verification off; every other host keeps the
 * raw connection string, byte-for-byte.
 *
 * No real database is involved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPoolConfig, isSupabaseHost } from "../lib/server/poolConfig";

const NEON_URL =
  "postgres://neondb_owner:secret@ep-example.us-east-1.aws.neon.tech:5432/neondb?sslmode=require";
const SUPABASE_DIRECT_URL =
  "postgres://postgres:secret@db.qwgxtzjahayusqcsyplw.supabase.co:5432/postgres?sslmode=require";
const SUPABASE_POOLER_URL =
  "postgres://postgres.qwgxtzjahayusqcsyplw:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";

test("isSupabaseHost matches the direct and pooler hosts only", () => {
  assert.equal(isSupabaseHost("db.qwgxtzjahayusqcsyplw.supabase.co"), true);
  assert.equal(isSupabaseHost("aws-1-us-east-1.pooler.supabase.com"), true);
  assert.equal(isSupabaseHost("ep-example.us-east-1.aws.neon.tech"), false);
  assert.equal(isSupabaseHost("localhost"), false);
});

test("Neon URL passes through untouched (the working path never changes)", () => {
  assert.deepEqual(buildPoolConfig(NEON_URL), { connectionString: NEON_URL });
});

test("Supabase direct URL: explicit fields, SSL on, chain verification off", () => {
  const config = buildPoolConfig(SUPABASE_DIRECT_URL);
  assert.equal(config.connectionString, undefined);
  assert.equal(config.host, "db.qwgxtzjahayusqcsyplw.supabase.co");
  assert.equal(config.port, 5432);
  assert.equal(config.user, "postgres");
  assert.equal(config.password, "secret");
  assert.equal(config.database, "postgres");
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test("Supabase pooler URL: transaction-mode port + project user preserved", () => {
  const config = buildPoolConfig(SUPABASE_POOLER_URL);
  assert.equal(config.connectionString, undefined);
  assert.equal(config.host, "aws-1-us-east-1.pooler.supabase.com");
  assert.equal(config.port, 6543);
  assert.equal(config.user, "postgres.qwgxtzjahayusqcsyplw");
  assert.equal(config.database, "postgres");
  assert.deepEqual(config.ssl, { rejectUnauthorized: false });
});

test("the string's sslmode no longer matters for Supabase hosts", () => {
  // require, no-verify, verify-full, or absent — code decides, not the
  // string a dashboard hands out or a future pg release re-parses.
  for (const mode of ["require", "no-verify", "verify-full", "prefer"]) {
    const config = buildPoolConfig(SUPABASE_DIRECT_URL.replace("sslmode=require", `sslmode=${mode}`));
    assert.deepEqual(config.ssl, { rejectUnauthorized: false }, `sslmode=${mode}`);
  }
  const bare = buildPoolConfig(SUPABASE_DIRECT_URL.replace("?sslmode=require", ""));
  assert.deepEqual(bare.ssl, { rejectUnauthorized: false });
});

test("percent-encoded credentials are decoded for the explicit config", () => {
  const config = buildPoolConfig(
    "postgres://postgres:p%40ss%2Fword@db.qwgxtzjahayusqcsyplw.supabase.co:5432/postgres",
  );
  assert.equal(config.password, "p@ss/word");
});

test("an unparseable string falls back to the raw connection string", () => {
  assert.deepEqual(buildPoolConfig("not a url"), { connectionString: "not a url" });
});
