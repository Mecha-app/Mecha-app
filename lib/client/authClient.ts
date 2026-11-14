import { createAuthClient } from "better-auth/react";

/**
 * The Better Auth client (AUTH DECISION 2026-11-06) — used by the
 * social sign-in block to start the Google flow
 * (authClient.signIn.social). Same-origin: the handler lives at
 * /api/auth on this app, so no baseURL is needed. After the Better
 * Auth callback, the browser lands on /auth/google/complete, which
 * exchanges the Better Auth cookie session for the app's standard
 * payload via /api/auth/session-bridge and stores it with the same
 * saveSession contract as every other sign-in door.
 */
export const authClient = createAuthClient();
