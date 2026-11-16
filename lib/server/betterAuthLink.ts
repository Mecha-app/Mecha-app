import { authResultFor, type AuthResult } from "./authService";
import { normalizeEmail } from "./identity";
import type { IdentityStore, UserRecord } from "./store";

/**
 * The store-level half of the Better Auth integration (see
 * betterAuth.ts for the engine config). Everything here runs against
 * the app's IdentityStore — the SAME store the legacy auth service
 * uses — so the behavior is identical no matter which door the
 * customer came through:
 *
 *   - applyGoogleAccountLink: the databaseHook that fires when
 *     Better Auth creates a Google account row. It stamps the app
 *     identity columns (google_sub, auth_method, verified stamp)
 *     through the store's linkGoogleAccount — the same write the
 *     legacy callback performs.
 *   - createGoogleUserViaBetterAuth: the row Better Auth inserts on
 *     a first-time Google sign-up (profile name/email/avatar,
 *     email_verified as Google asserted it, password_hash NULL,
 *     phone NULL) followed by the account-link stamp. Better Auth's
 *     own engine performs these writes against Postgres in
 *     production; this helper is the same two writes expressed
 *     against the IdentityStore so the test-suite can drive them
 *     against the in-memory store (the suite's standing pattern —
 *     Better Auth's engine internals are covered by its upstream
 *     tests; what MECHA owns is the identity behavior).
 *   - betterAuthSessionPayload: the session bridge — a live Better
 *     Auth session's user id becomes the app's standard payload
 *     ({token, user, quota}) via authService.authResultFor, so the
 *     payload shape is byte-identical across every sign-in door.
 */

export async function applyGoogleAccountLink(
  store: IdentityStore,
  input: { userId: string; googleSub: string },
): Promise<UserRecord | null> {
  const user = await store.findUserById(input.userId);
  if (!user) return null;
  if (user.googleSub === input.googleSub) return user; // idempotent
  return store.linkGoogleAccount(input.userId, input.googleSub);
}

export async function createGoogleUserViaBetterAuth(
  store: IdentityStore,
  profile: { sub: string; email: string; name: string; emailVerified: boolean },
): Promise<UserRecord> {
  const email = normalizeEmail(profile.email) ?? profile.email;
  const name =
    profile.name.trim().length > 0 ? profile.name.trim().slice(0, 120) : email.split("@")[0];
  const user = await store.createUser({
    name,
    email,
    phone: null,
    phoneNormalized: null,
    passwordHash: null,
    googleSub: profile.sub,
    authMethod: "google",
  });
  if (profile.emailVerified) {
    await store.markEmailVerified(user.id);
  }
  const stamped = await applyGoogleAccountLink(store, {
    userId: user.id,
    googleSub: profile.sub,
  });
  return stamped ?? (await store.findUserById(user.id)) ?? user;
}

/** Standard payload for a Better Auth session's user, or null when
 * the account no longer exists. */
export async function betterAuthSessionPayload(
  store: IdentityStore,
  userId: string,
): Promise<AuthResult | null> {
  const user = await store.findUserById(userId);
  if (!user) return null;
  return authResultFor(user);
}
