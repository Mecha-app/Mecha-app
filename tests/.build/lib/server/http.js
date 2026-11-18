"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayloadTooLargeError = exports.MAX_JSON_BODY_BYTES = void 0;
exports.apiError = apiError;
exports.readJsonBody = readJsonBody;
const server_1 = require("next/server");
const db_1 = require("./db");
const errors_1 = require("./errors");
const jwt_1 = require("./jwt");
const poolConfig_1 = require("./poolConfig");
const store_1 = require("./store");
const authService_1 = require("./authService");
/**
 * Shared error → HTTP mapping for the WP5 API routes. The stance is the
 * rebuild's standing one: honest errors, no fake success. A capability
 * that is not wired in this environment says so (501) instead of
 * pretending to work. Error bodies NEVER carry stack traces, env
 * values, tokens, or upstream provider payloads.
 */
/** Sanity cap for JSON request bodies (security pass). Every JSON body
 * this API legitimately takes — credentials, a diagnosis request (the
 * problem text itself is capped at 4000 chars in the route), a waitlist
 * email, a checkout plan — is far below this. */
exports.MAX_JSON_BODY_BYTES = 32_768;
class PayloadTooLargeError extends Error {
    code = "payload_too_large";
    constructor(maxBytes) {
        super(`Request body exceeds ${maxBytes} bytes.`);
        this.name = "PayloadTooLargeError";
    }
}
exports.PayloadTooLargeError = PayloadTooLargeError;
function apiError(err) {
    if (err instanceof PayloadTooLargeError) {
        return server_1.NextResponse.json({ error: err.code, detail: "Request body too large." }, { status: 413 });
    }
    if (err instanceof errors_1.UploadTooLargeError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 413 });
    }
    if (err instanceof store_1.IdentityConflictError) {
        return server_1.NextResponse.json({ error: err.code, field: err.field, detail: err.message }, { status: 409 });
    }
    if (err instanceof authService_1.ValidationError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 400 });
    }
    if (err instanceof authService_1.PasswordMismatchError) {
        // Registration confirmation didn't match the password. The client
        // maps this code to its dictionary copy, like google_signin_required.
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 400 });
    }
    if (err instanceof authService_1.InvalidCredentialsError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 401 });
    }
    if (err instanceof authService_1.GoogleOnlyAccountError) {
        // Password attempt on a Google-only account: the specific, honest
        // answer (the client maps this code to its dictionary copy).
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 401 });
    }
    if (err instanceof errors_1.InvalidCodeError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 400 });
    }
    if (err instanceof errors_1.AlreadyVerifiedError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 409 });
    }
    if (err instanceof errors_1.ResendTooSoonError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message, retryAfterSeconds: err.retryAfterSeconds }, { status: 429 });
    }
    if (err instanceof errors_1.NotFoundError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 404 });
    }
    if (err instanceof errors_1.ForbiddenError) {
        return server_1.NextResponse.json({ error: err.code, detail: err.message }, { status: 403 });
    }
    if (err instanceof db_1.DatabaseNotConfiguredError) {
        return server_1.NextResponse.json({
            status: "unavailable",
            error: err.code,
            detail: "Accounts are not wired in this environment yet — no data was stored.",
        }, { status: 501 });
    }
    if (err instanceof jwt_1.AuthNotConfiguredError) {
        return server_1.NextResponse.json({
            status: "unavailable",
            error: err.code,
            detail: "Sign-in is not wired in this environment yet.",
        }, { status: 501 });
    }
    // Postgres invalid-text-representation (SQLSTATE 22P02): a malformed
    // id — a non-UUID string, an empty string — compared against a uuid
    // column makes the driver throw instead of returning zero rows. Such
    // a value cannot name a row, so the honest answer is the same 404 the
    // typed NotFoundError produces, never a 500. (Click-audit find,
    // 2026-11-03: the in-memory store's string comparisons never raise
    // this, so the suite alone could not see the live behavior. Probed
    // live: messages post/thread, listing get, vehicle get/patch/delete
    // all answered 500 for garbage ids while well-formed unknown ids
    // answered the correct 404.)
    if (typeof err === "object" &&
        err !== null &&
        err.code === "22P02") {
        return server_1.NextResponse.json({ error: "not_found", detail: "The requested item does not exist." }, { status: 404 });
    }
    // Unhandled: the client still gets the generic 500 (error bodies
    // never carry internals — see the module comment), but the REAL
    // error is logged server-side first. Until 2026-11-15 this branch
    // swallowed the error entirely: the Supabase cutover's failing
    // database connections surfaced as bare 500s with nothing in the
    // function logs, and the connection fault had to be diagnosed from
    // the database's own logs instead. Sanitized fields only (name,
    // message, code) — never the error object or any env value.
    (0, poolConfig_1.logDatabaseError)("unhandled api error", err);
    return server_1.NextResponse.json({ status: "error", error: "internal_error", detail: "Something went wrong on our side." }, { status: 500 });
}
/**
 * Read a JSON request body with a size cap. Returns the parsed object,
 * or null when the body is not a JSON object (the routes' existing
 * "invalid_json" path). Throws PayloadTooLargeError when the declared
 * or actual size exceeds the cap — callers map it via apiError (413).
 */
async function readJsonBody(request, maxBytes = exports.MAX_JSON_BODY_BYTES) {
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxBytes) {
        throw new PayloadTooLargeError(maxBytes);
    }
    let text;
    try {
        text = await request.text();
    }
    catch {
        return null;
    }
    if (new TextEncoder().encode(text).length > maxBytes) {
        throw new PayloadTooLargeError(maxBytes);
    }
    try {
        const body = JSON.parse(text);
        if (body === null || typeof body !== "object" || Array.isArray(body))
            return null;
        return body;
    }
    catch {
        return null;
    }
}
