import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "./db";
import { ForbiddenError, NotFoundError } from "./errors";
import { AuthNotConfiguredError } from "./jwt";
import { IdentityConflictError } from "./store";
import { InvalidCredentialsError, ValidationError } from "./authService";

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
export const MAX_JSON_BODY_BYTES = 32_768;

export class PayloadTooLargeError extends Error {
  readonly code = "payload_too_large";
  constructor(maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes.`);
    this.name = "PayloadTooLargeError";
  }
}

export function apiError(err: unknown): NextResponse {
  if (err instanceof PayloadTooLargeError) {
    return NextResponse.json(
      { error: err.code, detail: "Request body too large." },
      { status: 413 },
    );
  }
  if (err instanceof IdentityConflictError) {
    return NextResponse.json(
      { error: err.code, field: err.field, detail: err.message },
      { status: 409 },
    );
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.code, detail: err.message }, { status: 400 });
  }
  if (err instanceof InvalidCredentialsError) {
    return NextResponse.json({ error: err.code, detail: err.message }, { status: 401 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.code, detail: err.message }, { status: 404 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.code, detail: err.message }, { status: 403 });
  }
  if (err instanceof DatabaseNotConfiguredError) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: err.code,
        detail: "Accounts are not wired in this environment yet — no data was stored.",
      },
      { status: 501 },
    );
  }
  if (err instanceof AuthNotConfiguredError) {
    return NextResponse.json(
      {
        status: "unavailable",
        error: err.code,
        detail: "Sign-in is not wired in this environment yet.",
      },
      { status: 501 },
    );
  }
  return NextResponse.json(
    { status: "error", error: "internal_error", detail: "Something went wrong on our side." },
    { status: 500 },
  );
}

/**
 * Read a JSON request body with a size cap. Returns the parsed object,
 * or null when the body is not a JSON object (the routes' existing
 * "invalid_json" path). Throws PayloadTooLargeError when the declared
 * or actual size exceeds the cap — callers map it via apiError (413).
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }
  try {
    const body = JSON.parse(text) as unknown;
    if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
