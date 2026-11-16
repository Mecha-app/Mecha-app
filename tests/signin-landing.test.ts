/**
 * Sign-in landing contract — the owner's fix (2026-11-16, folded
 * into design pass #8). He signed in with Google on his phone and
 * hit the phone-number wall at /app/complete-profile instead of
 * his account: "once you sign in you should be able to see inside
 * of your account and see like the options."
 *
 * What is pinned here:
 *   (a) after ANY successful sign-in the user lands IN the
 *       dashboard (/app) — the Google completion page has NO
 *       phone branch anymore, and the email login's default
 *       destination is /app; a saved return-to (the scan flow's
 *       contract) still wins on both doors, because that is the
 *       user's own intent, not a wall;
 *   (b) the phone number moved to the dashboard as a
 *       non-blocking, dismissible, in-place card
 *       (tests/dashboard.test.ts pins the card itself);
 *   (c) /app/complete-profile still exists as a deep link (the
 *       diagnose flow's phone gate routes there — pinned by
 *       tests/diagnosis-gate.test.ts), saving through the same
 *       endpoint the dashboard card uses;
 *   (d) the diagnosis gate and the free-diagnosis counting are
 *       untouched: the count keys on the account, diagnoses
 *       still require the number on file (diagnosis-gate suite).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("google sign-in completion: no phone wall — every account lands in the dashboard", () => {
  const page = read("app/auth/google/complete/page.tsx");
  assert.ok(
    !page.includes('"/app/complete-profile"'),
    "the Google completion page never routes to complete-profile",
  );
  assert.ok(!page.includes("!user.phone"), "there is no phone branch in the completion routing");
  assert.ok(page.includes('let target = "/app"'), "the default landing is the dashboard");
  // The scan flow's return-to contract survives: an in-app
  // return-to the user themselves set still wins.
  assert.ok(page.includes("RETURN_TO_KEY"), "the return-to is still read");
  assert.ok(page.includes('returnTo.startsWith("/app/")'), "only in-app return-tos are honored");
  // Both doors still feed the same finish: the legacy fragment
  // payload and the Better Auth session bridge.
  assert.ok(page.includes("/api/auth/session-bridge"), "the Better Auth door still exchanges its session");
});

test("email sign-in: the login default destination is the dashboard", () => {
  const login = read("app/login/page.tsx");
  assert.ok(login.includes('return "/app";'), "postAuthDestination defaults to /app");
  assert.ok(!login.includes('return "/app/diagnose";'), "sign-in no longer defaults to a single screen");
  assert.ok(!login.includes("/app/complete-profile"), "the login page never routes to the phone wall");
  assert.ok(login.includes('target.startsWith("/app/")'), "the return-to contract is unchanged");
});

test("complete-profile survives as a deep link on the same save endpoint as the dashboard card", () => {
  const wall = read("app/app/complete-profile/page.tsx");
  assert.ok(wall.includes('"/api/auth/complete-phone"'), "the deep-link page saves via complete-phone");
  const dashboard = read("app/app/page.tsx");
  assert.ok(dashboard.includes('"/api/auth/complete-phone"'), "the dashboard card uses the same endpoint");
});

test("registration keeps its own owner-ordered landing (account creation is not sign-in)", () => {
  const register = read("app/register/page.tsx");
  assert.ok(
    register.includes('return "/app/vault?welcome=1";'),
    "new accounts still land on Add your first vehicle, as ordered",
  );
  assert.ok(!register.includes("/app/complete-profile"), "registration never routes to the phone wall");
});
