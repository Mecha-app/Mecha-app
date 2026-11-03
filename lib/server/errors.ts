/**
 * Shared service-layer errors (WP6). Leaf module — no imports — so any
 * service can throw them and lib/server/http.ts can map them without an
 * import cycle. Bodies rendered from these NEVER carry internals (see
 * http.ts): a not-found is a not-found, whoever asked.
 */

export class NotFoundError extends Error {
  readonly code = "not_found";
  constructor(detail = "The requested item does not exist.") {
    super(detail);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "forbidden";
  constructor(detail = "This account cannot access that item.") {
    super(detail);
    this.name = "ForbiddenError";
  }
}

/**
 * Account-code errors (0011) — email-verification and password-reset
 * codes. The InvalidCodeError message is deliberately ONE generic text
 * for every failure (unknown identifier, no live code, expired, wrong
 * code, attempts exhausted): the reset flow must never reveal which
 * part failed, or it becomes an account-existence oracle.
 */
export class InvalidCodeError extends Error {
  readonly code = "invalid_code";
  constructor() {
    super("That code doesn't match, or it has expired. Request a new code and try again.");
    this.name = "InvalidCodeError";
  }
}

export class AlreadyVerifiedError extends Error {
  readonly code = "already_verified";
  constructor() {
    super("This email is already verified.");
    this.name = "AlreadyVerifiedError";
  }
}

export class ResendTooSoonError extends Error {
  readonly code = "resend_too_soon";
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("A code was just sent — give it a moment, then try again.");
    this.name = "ResendTooSoonError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
