"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * db.ts pg-driver tests (Supabase migration, 2026-11-14).
 *
 * lib/server/db.ts moved from the Neon serverless HTTP driver to the
 * standard pg Pool. These tests pin:
 *  1. The tagged-template → parameterized-query translation the module
 *     now performs (text + params, casts preserved in the text).
 *  2. The honesty contract, unchanged: with DATABASE_URL absent the
 *     module reports not-configured and refuses — nothing fake-stored.
 *
 * No real database is involved.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const db_1 = require("../lib/server/db");
(0, node_test_1.test)("buildParameterizedQuery numbers placeholders in order", () => {
    const email = "driver@example.com";
    const source = "homepage";
    const { text, params } = (0, db_1.buildParameterizedQuery)(["INSERT INTO waitlist_signups (email, source) VALUES (", ", ", ") RETURNING id"], [email, source]);
    strict_1.default.equal(text, "INSERT INTO waitlist_signups (email, source) VALUES ($1, $2) RETURNING id");
    strict_1.default.deepEqual(params, [email, source]);
});
(0, node_test_1.test)("buildParameterizedQuery keeps casts attached to their placeholder", () => {
    const { text, params } = (0, db_1.buildParameterizedQuery)(["INSERT INTO diagnostics (ai_result) VALUES (", "::jsonb)"], ["{}"]);
    strict_1.default.equal(text, "INSERT INTO diagnostics (ai_result) VALUES ($1::jsonb)");
    strict_1.default.deepEqual(params, ["{}"]);
});
(0, node_test_1.test)("buildParameterizedQuery with no values is the plain string", () => {
    const { text, params } = (0, db_1.buildParameterizedQuery)(["SELECT 1"], []);
    strict_1.default.equal(text, "SELECT 1");
    strict_1.default.deepEqual(params, []);
});
(0, node_test_1.test)("unconfigured database: honest refusal, nothing stored", async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
        strict_1.default.equal((0, db_1.isDatabaseConfigured)(), false);
        strict_1.default.throws(() => (0, db_1.getSql)(), db_1.DatabaseNotConfiguredError);
        await strict_1.default.rejects(db_1.waitlistStore.addSignup({ email: "nobody@example.com" }), db_1.DatabaseNotConfiguredError);
    }
    finally {
        if (saved === undefined)
            delete process.env.DATABASE_URL;
        else
            process.env.DATABASE_URL = saved;
    }
});
