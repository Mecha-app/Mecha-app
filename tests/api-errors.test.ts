/**
 * API error mapping — the click-audit regression pin (2026-11-03).
 *
 * Run: npm test  (compiles lib/server + tests to tests/.build, then
 * node --test).
 *
 * The live audit found that a malformed id (a non-UUID string, an empty
 * string) sent to an id-addressed route made Postgres throw SQLSTATE
 * 22P02 (invalid text representation) out of the Pg store, and apiError
 * mapped it to 500 internal_error — while a well-formed but unknown id
 * on the same route answered the correct 404. The in-memory store used
 * across this suite compares ids as strings and never raises 22P02, so
 * only the mapping itself can be pinned here: a driver-shaped 22P02
 * error must map to 404 not_found, and the pre-existing mappings must
 * not move.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { apiError } from "../lib/server/http";
import { NotFoundError } from "../lib/server/errors";
import { ValidationError } from "../lib/server/authService";

/** A pg-driver-shaped error: an Error carrying the SQLSTATE in .code. */
function pgError(code: string): Error {
  const err = new Error(`invalid input syntax for type uuid: "not-a-uuid"`) as Error & {
    code?: string;
  };
  err.code = code;
  return err;
}

test("apiError: Postgres 22P02 (malformed id) maps to 404 not_found, never 500", async () => {
  const res = apiError(pgError("22P02"));
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error?: string; detail?: string };
  assert.equal(body.error, "not_found");
  assert.ok(!JSON.stringify(body).includes("uuid"), "body must not leak driver internals");
});

test("apiError: typed errors keep their mappings", async () => {
  const nf = apiError(new NotFoundError("Vehicle not found."));
  assert.equal(nf.status, 404);
  assert.equal(((await nf.json()) as { error?: string }).error, "not_found");

  const val = apiError(new ValidationError("Bad field."));
  assert.equal(val.status, 400);
});

test("apiError: a genuinely unexpected error still maps to 500 internal_error", async () => {
  const res = apiError(new Error("boom"));
  assert.equal(res.status, 500);
  const body = (await res.json()) as { error?: string; detail?: string };
  assert.equal(body.error, "internal_error");
  assert.ok(!body.detail?.includes("boom"), "500 body must not leak the error message");
});

test("apiError: other Postgres SQLSTATEs are NOT swept into the 404 mapping", async () => {
  // e.g. 23505 (unique violation) is a store-integrity signal the
  // services translate themselves; it must stay a 500 here so it can
  // never be silently mistaken for "not found".
  const res = apiError(pgError("23505"));
  assert.equal(res.status, 500);
});
