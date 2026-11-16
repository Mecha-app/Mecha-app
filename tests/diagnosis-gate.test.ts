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
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "diagnosis-gate-test-secret";

import { registerDriver } from "../lib/server/authService";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import { signToken } from "../lib/server/jwt";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { requireAuth, requireDriverUser } from "../lib/server/routeAuth";
import { MemoryIdentityStore } from "../lib/server/store";

const DRIVER = {
  name: "Gate Tester",
  email: "gate@example.com",
  phone: "(617) 555-0119",
  password: "correct horse battery",
};

function req(token?: string): Request {
  return new Request("http://test.invalid/api/diagnose", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

async function collect(
  gen: AsyncGenerator<DiagnoseServiceEvent>,
): Promise<DiagnoseServiceEvent[]> {
  const events: DiagnoseServiceEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

/* --------------- (a) anonymous API attempts refused --------------- */

test("gate: no token → 401, and the store is never even opened", async () => {
  const store = new MemoryIdentityStore();
  let storeTouched = false;
  const result = await requireDriverUser(req(), () => {
    storeTouched = true;
    return store;
  });
  assert.ok("response" in result, "no user may leak to an anonymous caller");
  if ("response" in result) {
    assert.equal(result.response.status, 401);
    const body = (await result.response.json()) as { error?: string };
    assert.equal(body.error, "unauthorized");
  }
  assert.equal(storeTouched, false, "refusal happens before any store access");
});

test("gate: garbage, foreign-signed, and expired tokens → 401", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail(DRIVER.email);
  assert.ok(user);

  const garbage = await requireDriverUser(req("not-a-real-token"), () => store);
  assert.ok("response" in garbage && garbage.response.status === 401);

  // A token signed under a different secret (another issuer) is invalid here.
  const realSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "some-other-issuer-secret";
  const foreign = signToken({ id: user.id, type: "driver" });
  process.env.JWT_SECRET = realSecret;
  const foreignResult = await requireDriverUser(req(foreign), () => store);
  assert.ok("response" in foreignResult && foreignResult.response.status === 401);

  const expired = signToken({ id: user.id, type: "driver" }, -3600);
  const expiredResult = await requireDriverUser(req(expired), () => store);
  assert.ok("response" in expiredResult && expiredResult.response.status === 401);
});

test("gate: a valid token for a non-driver account is NOT a diagnosis account → 401", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail(DRIVER.email);
  assert.ok(user);
  for (const type of ["shop", "towing"] as const) {
    const token = signToken({ id: user.id, type });
    const result = await requireDriverUser(req(token), () => store);
    assert.ok("response" in result, `${type} token must not pass the diagnosis gate`);
    if ("response" in result) assert.equal(result.response.status, 401);
  }
});

test("gate: a valid driver token for a deleted/unknown account → 401", async () => {
  const store = new MemoryIdentityStore();
  const token = signToken({ id: "no-such-account", type: "driver" });
  const result = await requireDriverUser(req(token), () => store);
  assert.ok("response" in result);
  if ("response" in result) assert.equal(result.response.status, 401);
});

test("gate: unwired auth answers the honest 501, never a diagnosis", async () => {
  const store = new MemoryIdentityStore();
  const realSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    const result = await requireDriverUser(req(), () => store);
    assert.ok("response" in result);
    if ("response" in result) assert.equal(result.response.status, 501);
  } finally {
    process.env.JWT_SECRET = realSecret;
  }
});

test("gate: requireAuth(['driver']) — the scan/VIN/recent gate — refuses anonymous + shop, admits driver", async () => {
  const store = new MemoryIdentityStore();
  const auth = await registerDriver(store, DRIVER);

  const anon = requireAuth(req(), ["driver"]);
  assert.ok("response" in anon && anon.response.status === 401);

  const user = await store.findUserByEmail(DRIVER.email);
  assert.ok(user);
  const shopToken = signToken({ id: user.id, type: "shop" });
  const shop = requireAuth(req(shopToken), ["driver"]);
  assert.ok("response" in shop && shop.response.status === 403);

  const driver = requireAuth(req(auth.token), ["driver"]);
  assert.ok("payload" in driver, "a signed-in driver passes");
  if ("payload" in driver) assert.equal(driver.payload.id, user.id);
});

/* --------------- (c) signed-in driver can diagnose ---------------- */

test("gate → service: a signed-in driver passes the gate and the diagnosis runs", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const auth = await registerDriver(store, DRIVER);
  assert.equal(auth.quota.remaining, 5);

  const gated = await requireDriverUser(req(auth.token), () => store);
  assert.ok("user" in gated, "the gate returns the account record");
  if (!("user" in gated)) return;
  assert.equal(gated.user.email, DRIVER.email);
  assert.equal(gated.store, store);

  const events = await collect(
    executeDiagnosis(
      { store: gated.store, provider },
      { user: gated.user, request: { problem: "Grinding noise when I brake" } },
    ),
  );
  const done = events.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done, "the diagnosis completes for a signed-in driver");
  assert.equal(done.quota.remaining, 4, "exactly one quota unit consumed");
  assert.equal(provider.calls.length, 1);
});

/* --------- route wiring: the gate is the routes' front door -------- */

test("route wiring: every diagnosis-executing route runs an account gate", () => {
  const root = process.cwd();
  const gated: Record<string, string> = {
    "app/api/diagnose/route.ts": "requireDriverUser",
    "app/api/diagnose/check-limit/route.ts": "requireDriverUser",
    "app/api/scan/photo/route.ts": "requireAuth",
    "app/api/vin/decode/route.ts": "requireAuth",
    "app/api/diagnoses/recent/route.ts": "requireAuth",
  };
  for (const [file, gate] of Object.entries(gated)) {
    const source = readFileSync(join(root, file), "utf8");
    assert.ok(source.includes(gate), `${file} must run the ${gate} account gate`);
  }
});

/* --------------- (b) anonymous page attempts → sign-in ------------- */

test("page contract: /app/diagnose bounces anonymous visitors to /login — and has NO phone wall", () => {
  const root = process.cwd();
  const page = readFileSync(join(root, "app/app/diagnose/page.tsx"), "utf8");
  assert.ok(page.includes("if (!getToken())"), "tokenless visitors are bounced on load");
  assert.ok(page.includes('window.location.href = "/login"'), "the bounce target is /login");
  assert.ok(page.includes("clearSession()"), "a refused session is cleared, not retried");
  assert.ok(
    !page.includes("/app/complete-profile"),
    "a signed-in phone-less account is NEVER redirected to complete-profile (the removed wall)",
  );
  assert.ok(!page.includes("phone_required"), "the page carries no phone-gate branch");
  assert.ok(!page.includes("phone === null"), "the page never keys behavior off a missing phone");
});

test("page contract: /app/scan bounces anonymous visitors to /login — and has NO phone wall", () => {
  const root = process.cwd();
  const page = readFileSync(join(root, "app/app/scan/page.tsx"), "utf8");
  assert.ok(page.includes("if (!getToken())"), "tokenless visitors are bounced on load");
  assert.ok(page.includes('window.location.href = "/login"'), "the bounce target is /login");
  assert.ok(
    !page.includes("/app/complete-profile"),
    "a signed-in phone-less account is NEVER redirected to complete-profile from scan",
  );
  assert.ok(!page.includes("phone === null"), "the page never keys behavior off a missing phone");
});

test("gate → service: a signed-in driver with NO phone on file diagnoses — the account is the only requirement", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  const auth = await registerDriver(store, {
    name: "Phone Less",
    email: "phoneless@example.com",
    password: "correct horse battery",
  });
  const record = await store.findUserById(auth.user.id);
  assert.ok(record);
  assert.equal(record.phoneNormalized, null, "the account has no phone on file");

  const gated = await requireDriverUser(req(auth.token), () => store);
  assert.ok("user" in gated, "the account gate admits the phone-less driver");
  if (!("user" in gated)) return;

  const events = await collect(
    executeDiagnosis(
      { store: gated.store, provider },
      { user: gated.user, request: { problem: "Grinding noise when I brake" } },
    ),
  );
  const done = events.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done, "the diagnosis completes for a signed-in phone-less driver");
  assert.equal(done.quota.remaining, 4, "exactly one quota unit consumed, keyed on the account");
  assert.equal(provider.calls.length, 1);
});

function walk(dir: string, suffix: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, suffix));
    else if (entry.name.endsWith(suffix)) out.push(path);
  }
  return out;
}

test("public surface inventory: diagnosis execution exists ONLY inside the signed-in app", () => {
  const root = process.cwd();
  const needles = ["/api/diagnose", "/api/scan/photo", "/api/vin/decode"];
  const clientFiles = [
    ...walk(join(root, "app"), ".tsx"),
    ...walk(join(root, "components"), ".tsx"),
    ...walk(join(root, "lib/client"), ".ts"),
  ];
  const callers: string[] = [];
  for (const file of clientFiles) {
    const text = readFileSync(file, "utf8");
    if (!needles.some((n) => text.includes(n))) continue;
    const rel = file.slice(root.length + 1).replace(/\\/g, "/");
    callers.push(rel);
    assert.ok(
      rel.startsWith("app/app/"),
      `${rel} references a diagnosis API from OUTSIDE the signed-in app — public surfaces must not execute diagnoses`,
    );
  }
  assert.ok(callers.length >= 3, `the sweep should find the real in-app callers (saw ${callers.length})`);

  // The public funnel: marketing pages may SHOW the product, but the
  // only ways in are the gated app and account creation.
  const marketing = readFileSync(join(root, "components/MarketingRoutes.tsx"), "utf8");
  assert.ok(marketing.includes('href="/app/diagnose"'), "/diagnose sends runners into the gated app");
  assert.ok(marketing.includes('href="/register"'), "/diagnose offers account creation");
  const scanLanding = readFileSync(join(root, "components/ScanLanding.tsx"), "utf8");
  assert.ok(scanLanding.includes('href="/app/scan"'), "/scan sends runners into the gated app");
  assert.ok(scanLanding.includes('href="/register"'), "/scan offers account creation");
});
