import { NextResponse } from "next/server";
import {
  AuthNotConfiguredError,
  bearerPayload,
  isAuthConfigured,
  type AccountType,
  type TokenPayload,
} from "./jwt";
import type { IdentityStore, ShopRecord, UserRecord } from "./store";

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

/**
 * Driver-user gate — THE account requirement behind every diagnosis
 * surface (owner rule, 2026-11-16: nobody runs a diagnosis without an
 * account; they create one first). Used by POST /api/diagnose and
 * POST /api/diagnose/check-limit, which need the user RECORD (quota,
 * phone gate), not just the token payload. Semantics, matching those
 * routes' historical behavior exactly:
 *   - 501 when auth isn't wired in this environment (same body
 *     apiError produces for AuthNotConfiguredError),
 *   - 401 when the Bearer token is absent/invalid/expired, when the
 *     token is not a DRIVER token, or when the account no longer
 *     exists — an anonymous or wrong-account call is refused before
 *     any provider call or quota touch,
 *   - the store factory runs lazily, only after the token verifies,
 *     so an anonymous call to an unwired-database environment still
 *     answers 401, and a signed-in one surfaces the store's
 *     DatabaseNotConfiguredError to the route's error mapping.
 */
export async function requireDriverUser(
  request: Request,
  getStore: () => IdentityStore,
): Promise<{ user: UserRecord; store: IdentityStore } | { response: NextResponse }> {
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
  if (!payload || payload.type !== "driver") {
    return {
      response: NextResponse.json(
        { error: "unauthorized", detail: "Sign in to run a diagnosis." },
        { status: 401 },
      ),
    };
  }
  const store = getStore();
  const user = await store.findUserById(payload.id);
  if (!user) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user, store };
}

/**
 * Shop gate — the account requirement behind a SHOP-run diagnosis
 * (owner addition, 2026-11-19: shops diagnose the cars in their own
 * bays, against their trial/plan credits). Same semantics as
 * requireDriverUser, for a SHOP token and the shop RECORD (trial
 * window + credit counters live on it): 501 when auth isn't wired,
 * 401 for an absent/invalid/wrong-type token or a deleted account —
 * refused before any provider call or credit touch.
 */
export async function requireShopUser(
  request: Request,
  getStore: () => IdentityStore,
): Promise<{ shop: ShopRecord; store: IdentityStore } | { response: NextResponse }> {
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
  if (!payload || payload.type !== "shop") {
    return {
      response: NextResponse.json(
        { error: "unauthorized", detail: "Sign in to run a diagnosis." },
        { status: 401 },
      ),
    };
  }
  const store = getStore();
  const shop = await store.findShopById(payload.id);
  if (!shop) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { shop, store };
}
