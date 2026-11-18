"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
 *   (c) /app/complete-profile still exists as an OPTIONAL deep
 *       link, saving through the same endpoint the dashboard card
 *       uses — and since the pass #9 fix NOTHING routes to it: the
 *       acceptance test caught /app/diagnose auto-redirecting a
 *       signed-in phone-less account there, and the wall is
 *       removed from the page, the service, and the API;
 *   (d) the diagnosis ACCOUNT gate and the free-diagnosis
 *       counting are untouched: the count keys on the account,
 *       signed-out calls still 401 — and a phone is NOT a
 *       diagnosis requirement anymore (diagnosis-gate suite).
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const root = process.cwd();
const read = (rel) => (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, rel), "utf8");
(0, node_test_1.test)("google sign-in completion: no phone wall — every account lands in the dashboard", () => {
    const page = read("app/auth/google/complete/page.tsx");
    strict_1.default.ok(!page.includes('"/app/complete-profile"'), "the Google completion page never routes to complete-profile");
    strict_1.default.ok(!page.includes("!user.phone"), "there is no phone branch in the completion routing");
    strict_1.default.ok(page.includes('let target = "/app"'), "the default landing is the dashboard");
    // The scan flow's return-to contract survives: an in-app
    // return-to the user themselves set still wins.
    strict_1.default.ok(page.includes("RETURN_TO_KEY"), "the return-to is still read");
    strict_1.default.ok(page.includes('returnTo.startsWith("/app/")'), "only in-app return-tos are honored");
    // The legacy door still feeds finish() from its fragment
    // payload; the Better Auth door establishes the session through
    // a top-level navigation (tests/session-cookie.test.ts pins
    // that contract — the fetch + localStorage exchange looped on
    // the owner's phone).
    strict_1.default.ok(page.includes("/api/auth/google/establish"), "the Better Auth door establishes via navigation");
});
(0, node_test_1.test)("email sign-in: the login default destination is the dashboard", () => {
    const login = read("app/login/page.tsx");
    strict_1.default.ok(login.includes('return "/app";'), "postAuthDestination defaults to /app");
    strict_1.default.ok(!login.includes('return "/app/diagnose";'), "sign-in no longer defaults to a single screen");
    strict_1.default.ok(!login.includes("/app/complete-profile"), "the login page never routes to the phone wall");
    strict_1.default.ok(login.includes('target.startsWith("/app/")'), "the return-to contract is unchanged");
});
(0, node_test_1.test)("complete-profile survives as a deep link on the same save endpoint as the dashboard card", () => {
    const wall = read("app/app/complete-profile/page.tsx");
    strict_1.default.ok(wall.includes('"/api/auth/complete-phone"'), "the deep-link page saves via complete-phone");
    const dashboard = read("app/app/page.tsx");
    strict_1.default.ok(dashboard.includes('"/api/auth/complete-phone"'), "the dashboard card uses the same endpoint");
});
(0, node_test_1.test)("registration keeps its own owner-ordered landing (account creation is not sign-in)", () => {
    const register = read("app/register/page.tsx");
    strict_1.default.ok(register.includes('return "/app/vault?welcome=1";'), "new accounts still land on Add your first vehicle, as ordered");
    strict_1.default.ok(!register.includes("/app/complete-profile"), "registration never routes to the phone wall");
});
