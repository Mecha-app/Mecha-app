"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const http_1 = require("../lib/server/http");
const errors_1 = require("../lib/server/errors");
const authService_1 = require("../lib/server/authService");
/** A pg-driver-shaped error: an Error carrying the SQLSTATE in .code. */
function pgError(code) {
    const err = new Error(`invalid input syntax for type uuid: "not-a-uuid"`);
    err.code = code;
    return err;
}
(0, node_test_1.test)("apiError: Postgres 22P02 (malformed id) maps to 404 not_found, never 500", async () => {
    const res = (0, http_1.apiError)(pgError("22P02"));
    strict_1.default.equal(res.status, 404);
    const body = (await res.json());
    strict_1.default.equal(body.error, "not_found");
    strict_1.default.ok(!JSON.stringify(body).includes("uuid"), "body must not leak driver internals");
});
(0, node_test_1.test)("apiError: typed errors keep their mappings", async () => {
    const nf = (0, http_1.apiError)(new errors_1.NotFoundError("Vehicle not found."));
    strict_1.default.equal(nf.status, 404);
    strict_1.default.equal((await nf.json()).error, "not_found");
    const val = (0, http_1.apiError)(new authService_1.ValidationError("Bad field."));
    strict_1.default.equal(val.status, 400);
});
(0, node_test_1.test)("apiError: a genuinely unexpected error still maps to 500 internal_error", async () => {
    const res = (0, http_1.apiError)(new Error("boom"));
    strict_1.default.equal(res.status, 500);
    const body = (await res.json());
    strict_1.default.equal(body.error, "internal_error");
    strict_1.default.ok(!body.detail?.includes("boom"), "500 body must not leak the error message");
});
(0, node_test_1.test)("apiError: other Postgres SQLSTATEs are NOT swept into the 404 mapping", async () => {
    // e.g. 23505 (unique violation) is a store-integrity signal the
    // services translate themselves; it must stay a 500 here so it can
    // never be silently mistaken for "not found".
    const res = (0, http_1.apiError)(pgError("23505"));
    strict_1.default.equal(res.status, 500);
});
