import { createAuthClient } from "better-auth/react";

/**
 * The Better Auth client (AUTH DECISION 2026-11-06) — used by the
 * social sign-in block to start the Google flow
 * (authClient.signIn.social). Same-origin: the handler lives at
 * /api/auth on this app, so no baseURL is needed. After the Better
 * Auth callback, the browser lands on /auth/google/complete, which
 * hands off through a top-level navigation to
 * /api/auth/google/establish — the route that converts the Better
 * Auth cookie session into the app's session, setting the
 * first-party session cookie on its redirect response
 * (2026-11-16 persistence fix).
 */
export const authClient = createAuthClient();
