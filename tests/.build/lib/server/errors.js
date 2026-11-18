"use strict";
/**
 * Shared service-layer errors (WP6). Leaf module — no imports — so any
 * service can throw them and lib/server/http.ts can map them without an
 * import cycle. Bodies rendered from these NEVER carry internals (see
 * http.ts): a not-found is a not-found, whoever asked.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResendTooSoonError = exports.AlreadyVerifiedError = exports.InvalidCodeError = exports.ForbiddenError = exports.NotFoundError = exports.UploadTooLargeError = void 0;
/**
 * An uploaded file over its size cap (listing photos, 0015). Mapped
 * to 413 by http.ts — kept here, in the leaf module, so the upload
 * service stays importable by the test build (which excludes http.ts).
 */
class UploadTooLargeError extends Error {
    code = "payload_too_large";
    maxBytes;
    constructor(maxBytes) {
        super(`That photo is over ${Math.round(maxBytes / (1024 * 1024))} MB — try a smaller one.`);
        this.name = "UploadTooLargeError";
        this.maxBytes = maxBytes;
    }
}
exports.UploadTooLargeError = UploadTooLargeError;
class NotFoundError extends Error {
    code = "not_found";
    constructor(detail = "The requested item does not exist.") {
        super(detail);
        this.name = "NotFoundError";
    }
}
exports.NotFoundError = NotFoundError;
class ForbiddenError extends Error {
    code = "forbidden";
    constructor(detail = "This account cannot access that item.") {
        super(detail);
        this.name = "ForbiddenError";
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Account-code errors (0011) — email-verification and password-reset
 * codes. The InvalidCodeError message is deliberately ONE generic text
 * for every failure (unknown identifier, no live code, expired, wrong
 * code, attempts exhausted): the reset flow must never reveal which
 * part failed, or it becomes an account-existence oracle.
 */
class InvalidCodeError extends Error {
    code = "invalid_code";
    constructor() {
        super("That code doesn't match, or it has expired. Request a new code and try again.");
        this.name = "InvalidCodeError";
    }
}
exports.InvalidCodeError = InvalidCodeError;
class AlreadyVerifiedError extends Error {
    code = "already_verified";
    constructor() {
        super("This email is already verified.");
        this.name = "AlreadyVerifiedError";
    }
}
exports.AlreadyVerifiedError = AlreadyVerifiedError;
class ResendTooSoonError extends Error {
    code = "resend_too_soon";
    retryAfterSeconds;
    constructor(retryAfterSeconds) {
        super("A code was just sent — give it a moment, then try again.");
        this.name = "ResendTooSoonError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
exports.ResendTooSoonError = ResendTooSoonError;
