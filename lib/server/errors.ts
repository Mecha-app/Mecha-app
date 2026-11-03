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
