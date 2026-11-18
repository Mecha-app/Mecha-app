"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Diagnosis account-gate tests — the owner's rule (2026-11-16):
 * "Nobody can diagnose a vehicle if they don't have an account. They
 * have to create an account in order to actually run a diagnostic."
 *
 * Run: npm test. What is pinned here:
 *   (a) an anonymous (or wrong-account) call to a diagnosis surface is
 *       refused SERVER-SIDE — 401 from the exact gate functions the
 *       routes run (requireDriverUser for /api/diagnose +
 *       /api/diagnose/check-limit; requireAuth(["driver"]) for
 *       /api/scan/photo, /api/vin/decode, /api/diagnoses/recent) —
 *       before any store access, provider call, or quota touch;
 *   (b) an anonymous PAGE attempt routes to sign-in: /app/diagnose
 *       and /app/scan bounce a tokenless visitor to /login — and
 *       NEITHER page carries a phone wall (owner's rules,
 *       2026-11-16: a signed-in account, phone or not, uses the
 *       features; the acceptance test caught /app/diagnose
 *       auto-redirecting a phone-less account to
 *       /app/complete-profile, which is now pinned as forbidden) —
 *       and the public pages (/diagnose, /scan, homepage) contain
 *       NO diagnosis execution at all — their only paths in are the
 *       gated app and /register (inventory sweep over the client
 *       surface);
 *   (c) a signed-in driver passes the gate and CAN still diagnose —
 *       the gate returns the user record and executeDiagnosis runs
 *       end-to-end against the stub provider (the WP5 suite pins the
 *       service itself; this pins gate → service as one flow) —
 *       including a driver with NO phone on file.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "diagnosis-gate-test-secret";
const authService_1 = require("../lib/server/authService");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const jwt_1 = require("../lib/server/jwt");
const provider_1 = require("../lib/server/provider");
const routeAuth_1 = require("../lib/server/routeAuth");
const store_1 = require("../lib/server/store");
const DRIVER = {
    name: "Gate Tester",
    email: "gate@example.com",
    phone: "(617) 555-0119",
    password: "correct horse battery",
};
function req(token) {
    return new Request("http://test.invalid/api/diagnose", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
    });
}
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
/* --------------- (a) anonymous API attempts refused --------------- */
(0, node_test_1.test)("gate: no token → 401, and the store is never even opened", async () => {
    const store = new store_1.MemoryIdentityStore();
    let storeTouched = false;
    const result = await (0, routeAuth_1.requireDriverUser)(req(), () => {
        storeTouched = true;
        return store;
    });
    strict_1.default.ok("response" in result, "no user may leak to an anonymous caller");
    if ("response" in result) {
        strict_1.default.equal(result.response.status, 401);
        const body = (await result.response.json());
        strict_1.default.equal(body.error, "unauthorized");
    }
    strict_1.default.equal(storeTouched, false, "refusal happens before any store access");
});
(0, node_test_1.test)("gate: garbage, foreign-signed, and expired tokens → 401", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    const garbage = await (0, routeAuth_1.requireDriverUser)(req("not-a-real-token"), () => store);
    strict_1.default.ok("response" in garbage && garbage.response.status === 401);
    // A token signed under a different secret (another issuer) is invalid here.
    const realSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "some-other-issuer-secret";
    const foreign = (0, jwt_1.signToken)({ id: user.id, type: "driver" });
    process.env.JWT_SECRET = realSecret;
    const foreignResult = await (0, routeAuth_1.requireDriverUser)(req(foreign), () => store);
    strict_1.default.ok("response" in foreignResult && foreignResult.response.status === 401);
    const expired = (0, jwt_1.signToken)({ id: user.id, type: "driver" }, -3600);
    const expiredResult = await (0, routeAuth_1.requireDriverUser)(req(expired), () => store);
    strict_1.default.ok("response" in expiredResult && expiredResult.response.status === 401);
});
(0, node_test_1.test)("gate: a valid token for a non-driver account is NOT a diagnosis account → 401", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    for (const type of ["shop", "towing"]) {
        const token = (0, jwt_1.signToken)({ id: user.id, type });
        const result = await (0, routeAuth_1.requireDriverUser)(req(token), () => store);
        strict_1.default.ok("response" in result, `${type} token must not pass the diagnosis gate`);
        if ("response" in result)
            strict_1.default.equal(result.response.status, 401);
    }
});
(0, node_test_1.test)("gate: a valid driver token for a deleted/unknown account → 401", async () => {
    const store = new store_1.MemoryIdentityStore();
    const token = (0, jwt_1.signToken)({ id: "no-such-account", type: "driver" });
    const result = await (0, routeAuth_1.requireDriverUser)(req(token), () => store);
    strict_1.default.ok("response" in result);
    if ("response" in result)
        strict_1.default.equal(result.response.status, 401);
});
(0, node_test_1.test)("gate: unwired auth answers the honest 501, never a diagnosis", async () => {
    const store = new store_1.MemoryIdentityStore();
    const realSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
        const result = await (0, routeAuth_1.requireDriverUser)(req(), () => store);
        strict_1.default.ok("response" in result);
        if ("response" in result)
            strict_1.default.equal(result.response.status, 501);
    }
    finally {
        process.env.JWT_SECRET = realSecret;
    }
});
(0, node_test_1.test)("gate: requireAuth(['driver']) — the scan/VIN/recent gate — refuses anonymous + shop, admits driver", async () => {
    const store = new store_1.MemoryIdentityStore();
    const auth = await (0, authService_1.registerDriver)(store, DRIVER);
    const anon = (0, routeAuth_1.requireAuth)(req(), ["driver"]);
    strict_1.default.ok("response" in anon && anon.response.status === 401);
    const user = await store.findUserByEmail(DRIVER.email);
    strict_1.default.ok(user);
    const shopToken = (0, jwt_1.signToken)({ id: user.id, type: "shop" });
    const shop = (0, routeAuth_1.requireAuth)(req(shopToken), ["driver"]);
    strict_1.default.ok("response" in shop && shop.response.status === 403);
    const driver = (0, routeAuth_1.requireAuth)(req(auth.token), ["driver"]);
    strict_1.default.ok("payload" in driver, "a signed-in driver passes");
    if ("payload" in driver)
        strict_1.default.equal(driver.payload.id, user.id);
});
/* --------------- (c) signed-in driver can diagnose ---------------- */
(0, node_test_1.test)("gate → service: a signed-in driver passes the gate and the diagnosis runs", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    const auth = await (0, authService_1.registerDriver)(store, DRIVER);
    strict_1.default.equal(auth.quota.remaining, 5);
    const gated = await (0, routeAuth_1.requireDriverUser)(req(auth.token), () => store);
    strict_1.default.ok("user" in gated, "the gate returns the account record");
    if (!("user" in gated))
        return;
    strict_1.default.equal(gated.user.email, DRIVER.email);
    strict_1.default.equal(gated.store, store);
    const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store: gated.store, provider }, { user: gated.user, request: { problem: "Grinding noise when I brake" } }));
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done, "the diagnosis completes for a signed-in driver");
    strict_1.default.equal(done.quota.remaining, 4, "exactly one quota unit consumed");
    strict_1.default.equal(provider.calls.length, 1);
});
/* --------- route wiring: the gate is the routes' front door -------- */
(0, node_test_1.test)("route wiring: every diagnosis-executing route runs an account gate", () => {
    const root = process.cwd();
    const gated = {
        "app/api/diagnose/route.ts": "requireDriverUser",
        "app/api/diagnose/check-limit/route.ts": "requireDriverUser",
        "app/api/scan/photo/route.ts": "requireAuth",
        "app/api/vin/decode/route.ts": "requireAuth",
        "app/api/diagnoses/recent/route.ts": "requireAuth",
    };
    for (const [file, gate] of Object.entries(gated)) {
        const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, file), "utf8");
        strict_1.default.ok(source.includes(gate), `${file} must run the ${gate} account gate`);
    }
});
/* --------------- (b) anonymous page attempts → sign-in ------------- */
(0, node_test_1.test)("page contract: /app/diagnose bounces anonymous visitors to /login — and has NO phone wall", () => {
    const root = process.cwd();
    const page = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "app/app/diagnose/page.tsx"), "utf8");
    strict_1.default.ok(page.includes("if (!getToken())"), "tokenless visitors are bounced on load");
    strict_1.default.ok(page.includes('window.location.href = "/login"'), "the bounce target is /login");
    strict_1.default.ok(page.includes("clearSession()"), "a refused session is cleared, not retried");
    strict_1.default.ok(!page.includes("/app/complete-profile"), "a signed-in phone-less account is NEVER redirected to complete-profile (the removed wall)");
    strict_1.default.ok(!page.includes("phone_required"), "the page carries no phone-gate branch");
    strict_1.default.ok(!page.includes("phone === null"), "the page never keys behavior off a missing phone");
});
(0, node_test_1.test)("page contract: /app/scan bounces anonymous visitors to /login — and has NO phone wall", () => {
    const root = process.cwd();
    const page = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "app/app/scan/page.tsx"), "utf8");
    strict_1.default.ok(page.includes("if (!getToken())"), "tokenless visitors are bounced on load");
    strict_1.default.ok(page.includes('window.location.href = "/login"'), "the bounce target is /login");
    strict_1.default.ok(!page.includes("/app/complete-profile"), "a signed-in phone-less account is NEVER redirected to complete-profile from scan");
    strict_1.default.ok(!page.includes("phone === null"), "the page never keys behavior off a missing phone");
});
(0, node_test_1.test)("gate → service: a signed-in driver with NO phone on file diagnoses — the account is the only requirement", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    const auth = await (0, authService_1.registerDriver)(store, {
        name: "Phone Less",
        email: "phoneless@example.com",
        password: "correct horse battery",
    });
    const record = await store.findUserById(auth.user.id);
    strict_1.default.ok(record);
    strict_1.default.equal(record.phoneNormalized, null, "the account has no phone on file");
    const gated = await (0, routeAuth_1.requireDriverUser)(req(auth.token), () => store);
    strict_1.default.ok("user" in gated, "the account gate admits the phone-less driver");
    if (!("user" in gated))
        return;
    const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store: gated.store, provider }, { user: gated.user, request: { problem: "Grinding noise when I brake" } }));
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done, "the diagnosis completes for a signed-in phone-less driver");
    strict_1.default.equal(done.quota.remaining, 4, "exactly one quota unit consumed, keyed on the account");
    strict_1.default.equal(provider.calls.length, 1);
});
function walk(dir, suffix) {
    const out = [];
    for (const entry of (0, node_fs_1.readdirSync)(dir, { withFileTypes: true })) {
        const path = (0, node_path_1.join)(dir, entry.name);
        if (entry.isDirectory())
            out.push(...walk(path, suffix));
        else if (entry.name.endsWith(suffix))
            out.push(path);
    }
    return out;
}
(0, node_test_1.test)("public surface inventory: diagnosis execution exists ONLY inside the signed-in app", () => {
    const root = process.cwd();
    const needles = ["/api/diagnose", "/api/scan/photo", "/api/vin/decode"];
    const clientFiles = [
        ...walk((0, node_path_1.join)(root, "app"), ".tsx"),
        ...walk((0, node_path_1.join)(root, "components"), ".tsx"),
        ...walk((0, node_path_1.join)(root, "lib/client"), ".ts"),
    ];
    const callers = [];
    for (const file of clientFiles) {
        const text = (0, node_fs_1.readFileSync)(file, "utf8");
        if (!needles.some((n) => text.includes(n)))
            continue;
        const rel = file.slice(root.length + 1).replace(/\\/g, "/");
        callers.push(rel);
        strict_1.default.ok(rel.startsWith("app/app/"), `${rel} references a diagnosis API from OUTSIDE the signed-in app — public surfaces must not execute diagnoses`);
    }
    strict_1.default.ok(callers.length >= 3, `the sweep should find the real in-app callers (saw ${callers.length})`);
    // The public funnel: marketing pages may SHOW the product, but the
    // only ways in are the gated app and account creation.
    const marketing = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/MarketingRoutes.tsx"), "utf8");
    strict_1.default.ok(marketing.includes('href="/app/diagnose"'), "/diagnose sends runners into the gated app");
    strict_1.default.ok(marketing.includes('href="/register"'), "/diagnose offers account creation");
    const scanLanding = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/ScanLanding.tsx"), "utf8");
    strict_1.default.ok(scanLanding.includes('href="/app/scan"'), "/scan sends runners into the gated app");
    strict_1.default.ok(scanLanding.includes('href="/register"'), "/scan offers account creation");
});
