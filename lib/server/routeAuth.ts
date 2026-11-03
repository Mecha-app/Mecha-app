import { NextResponse } from "next/server";
import {
  AuthNotConfiguredError,
  bearerPayload,
  isAuthConfigured,
  type AccountType,
  type TokenPayload,
} from "./jwt";

/**
 * Route auth gate (WP6) — the shared front door for the authenticated
 * /api routes. Returns the verified payload, or a ready response:
 *   - 501 when auth isn't wired in this environment (honest, the same
 *     shape apiError produces for AuthNotConfiguredError),
 *   - 401 when the Bearer token is absent/invalid/expired,
 *   - 403 when the account type may not use this route.
 */
export function requireAuth(
  request: Request,
  types?: AccountType[],
): { payload: TokenPayload } | { response: NextResponse } {
  if (!isAuthConfigured()) {
    return {
      response: NextResponse.json(
        {
          status: "unavailable",
          error: new AuthNotConfiguredError().code,
          detail: "Sign-in is not wired in this environment yet.",
        },
        { status: 501 },
      ),
    };
  }
  let payload: TokenPayload | null = null;
  try {
    payload = bearerPayload(request);
  } catch {
    payload = null;
  }
  if (!payload) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (types && !types.includes(payload.type)) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { payload };
}
