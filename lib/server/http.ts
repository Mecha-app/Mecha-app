import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "./db";
import { AuthNotConfiguredError } from "./jwt";
import { IdentityConflictError } from "./store";
import { InvalidCredentialsError, ValidationError } from "./authService";

/**
 * Shared error → HTTP mapping for the WP5 API routes. The stance is the
 * rebuild's standing one: honest errors, no fake success. A capability
 * that is not wired in this environment says so (501) instead of
 * pretending to work.
 */
export function apiError(err: unknown): NextResponse {
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

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
