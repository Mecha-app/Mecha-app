"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const poolConfig_1 = require("../lib/server/poolConfig");
const NEON_URL = "postgres://neondb_owner:secret@ep-example.us-east-1.aws.neon.tech:5432/neondb?sslmode=require";
const SUPABASE_DIRECT_URL = "postgres://postgres:secret@db.qwgxtzjahayusqcsyplw.supabase.co:5432/postgres?sslmode=require";
const SUPABASE_POOLER_URL = "postgres://postgres.qwgxtzjahayusqcsyplw:secret@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
(0, node_test_1.test)("isSupabaseHost matches the direct and pooler hosts only", () => {
    strict_1.default.equal((0, poolConfig_1.isSupabaseHost)("db.qwgxtzjahayusqcsyplw.supabase.co"), true);
    strict_1.default.equal((0, poolConfig_1.isSupabaseHost)("aws-1-us-east-1.pooler.supabase.com"), true);
    strict_1.default.equal((0, poolConfig_1.isSupabaseHost)("ep-example.us-east-1.aws.neon.tech"), false);
    strict_1.default.equal((0, poolConfig_1.isSupabaseHost)("localhost"), false);
});
(0, node_test_1.test)("Neon URL passes through untouched (the working path never changes)", () => {
    strict_1.default.deepEqual((0, poolConfig_1.buildPoolConfig)(NEON_URL), { connectionString: NEON_URL });
});
(0, node_test_1.test)("Supabase direct URL: explicit fields, SSL on, chain verification off", () => {
    const config = (0, poolConfig_1.buildPoolConfig)(SUPABASE_DIRECT_URL);
    strict_1.default.equal(config.connectionString, undefined);
    strict_1.default.equal(config.host, "db.qwgxtzjahayusqcsyplw.supabase.co");
    strict_1.default.equal(config.port, 5432);
    strict_1.default.equal(config.user, "postgres");
    strict_1.default.equal(config.password, "secret");
    strict_1.default.equal(config.database, "postgres");
    strict_1.default.deepEqual(config.ssl, { rejectUnauthorized: false });
});
(0, node_test_1.test)("Supabase pooler URL: transaction-mode port + project user preserved", () => {
    const config = (0, poolConfig_1.buildPoolConfig)(SUPABASE_POOLER_URL);
    strict_1.default.equal(config.connectionString, undefined);
    strict_1.default.equal(config.host, "aws-1-us-east-1.pooler.supabase.com");
    strict_1.default.equal(config.port, 6543);
    strict_1.default.equal(config.user, "postgres.qwgxtzjahayusqcsyplw");
    strict_1.default.equal(config.database, "postgres");
    strict_1.default.deepEqual(config.ssl, { rejectUnauthorized: false });
});
(0, node_test_1.test)("the string's sslmode no longer matters for Supabase hosts", () => {
    // require, no-verify, verify-full, or absent — code decides, not the
    // string a dashboard hands out or a future pg release re-parses.
    for (const mode of ["require", "no-verify", "verify-full", "prefer"]) {
        const config = (0, poolConfig_1.buildPoolConfig)(SUPABASE_DIRECT_URL.replace("sslmode=require", `sslmode=${mode}`));
        strict_1.default.deepEqual(config.ssl, { rejectUnauthorized: false }, `sslmode=${mode}`);
    }
    const bare = (0, poolConfig_1.buildPoolConfig)(SUPABASE_DIRECT_URL.replace("?sslmode=require", ""));
    strict_1.default.deepEqual(bare.ssl, { rejectUnauthorized: false });
});
(0, node_test_1.test)("percent-encoded credentials are decoded for the explicit config", () => {
    const config = (0, poolConfig_1.buildPoolConfig)("postgres://postgres:p%40ss%2Fword@db.qwgxtzjahayusqcsyplw.supabase.co:5432/postgres");
    strict_1.default.equal(config.password, "p@ss/word");
});
(0, node_test_1.test)("an unparseable string falls back to the raw connection string", () => {
    strict_1.default.deepEqual((0, poolConfig_1.buildPoolConfig)("not a url"), { connectionString: "not a url" });
});
