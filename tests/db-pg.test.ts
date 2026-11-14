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
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DatabaseNotConfiguredError,
  buildParameterizedQuery,
  getSql,
  isDatabaseConfigured,
  waitlistStore,
} from "../lib/server/db";

test("buildParameterizedQuery numbers placeholders in order", () => {
  const email = "driver@example.com";
  const source = "homepage";
  const { text, params } = buildParameterizedQuery(
    ["INSERT INTO waitlist_signups (email, source) VALUES (", ", ", ") RETURNING id"],
    [email, source],
  );
  assert.equal(
    text,
    "INSERT INTO waitlist_signups (email, source) VALUES ($1, $2) RETURNING id",
  );
  assert.deepEqual(params, [email, source]);
});

test("buildParameterizedQuery keeps casts attached to their placeholder", () => {
  const { text, params } = buildParameterizedQuery(
    ["INSERT INTO diagnostics (ai_result) VALUES (", "::jsonb)"],
    ["{}"],
  );
  assert.equal(text, "INSERT INTO diagnostics (ai_result) VALUES ($1::jsonb)");
  assert.deepEqual(params, ["{}"]);
});

test("buildParameterizedQuery with no values is the plain string", () => {
  const { text, params } = buildParameterizedQuery(["SELECT 1"], []);
  assert.equal(text, "SELECT 1");
  assert.deepEqual(params, []);
});

test("unconfigured database: honest refusal, nothing stored", async () => {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal(isDatabaseConfigured(), false);
    assert.throws(() => getSql(), DatabaseNotConfiguredError);
    await assert.rejects(
      waitlistStore.addSignup({ email: "nobody@example.com" }),
      DatabaseNotConfiguredError,
    );
  } finally {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
  }
});
