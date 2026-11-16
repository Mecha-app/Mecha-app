/**
 * Scan package tests — /scan landing, /app/scan flow, dead-link sweep.
 *
 * Run: npm test. The owner's acceptance rules, pinned:
 *   - a scan that turns into a diagnosis consumes quota ONLY through
 *     diagnoseService — exactly one consume, via the WP5 path;
 *   - photo identification consumes NOTHING (triage, not a side door);
 *   - unauthenticated scan surfaces refuse honestly (401 at the API
 *     gate; the page bounces to /login with a return-to);
 *   - every internal href in the product maps to a real route — the
 *     route-inventory sweep that kills the /app/scan 404 class of bug.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "scan-test-secret";

import { registerDriver } from "../lib/server/authService";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import { StubDiagnosisProvider } from "../lib/server/provider";
import { requireAuth } from "../lib/server/routeAuth";
import {
  buildCodeDiagnosisPrefill,
  buildPhotoDiagnosisPrefill,
  buildVinDiagnosisPrefill,
  buildVinVehicleInfo,
  faultCodeInfo,
  parseWarningLightResult,
  validateFaultCode,
} from "../lib/server/scan";
import { identifyWarningLights } from "../lib/server/scanService";
import { MemoryIdentityStore } from "../lib/server/store";
import { StubWarningLightProvider } from "../lib/server/vision";

const DRIVER = {
  name: "Scan Tester",
  email: "scan@example.com",
  phone: "(617) 555-0177",
  password: "correct horse battery",
};

async function collect(
  gen: AsyncGenerator<DiagnoseServiceEvent>,
): Promise<DiagnoseServiceEvent[]> {
  const events: DiagnoseServiceEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

/* ------------------------- Code validation ------------------------ */

test("fault code validation: canonical codes accepted and normalized", () => {
  assert.equal(validateFaultCode("P0420"), "P0420");
  assert.equal(validateFaultCode("p0420"), "P0420");
  assert.equal(validateFaultCode("  P-0301 "), "P0301");
  assert.equal(validateFaultCode("B1234"), "B1234");
  assert.equal(validateFaultCode("C0561"), "C0561");
  assert.equal(validateFaultCode("U0100"), "U0100");
});

test("fault code validation: garbage is rejected, never guessed at", () => {
  for (const bad of ["", "P42", "P042", "P04200", "X0420", "P04G0", "12345", "PP420", "P042O0"]) {
    assert.equal(validateFaultCode(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("fault code info: system and scope come from the code itself", () => {
  assert.deepEqual(faultCodeInfo("P0420"), {
    code: "P0420",
    system: "Powertrain",
    scope: "generic",
  });
  assert.equal(faultCodeInfo("P1420").scope, "manufacturer");
  assert.equal(faultCodeInfo("U0100").system, "Network");
  assert.equal(faultCodeInfo("C0561").system, "Chassis");
  assert.equal(faultCodeInfo("B1234").system, "Body");
});

/* --------------------------- Handoffs ----------------------------- */

test("code handoff prefill: names the code and carries the vehicle through", () => {
  const prefill = buildCodeDiagnosisPrefill("P0420", "2019 Honda Accord");
  assert.ok(prefill.problem.includes("P0420"));
  assert.ok(prefill.problem.toLowerCase().includes("powertrain"));
  assert.equal(prefill.vehicleInfo, "2019 Honda Accord");
  const bare = buildCodeDiagnosisPrefill("P0420");
  assert.equal(bare.vehicleInfo, undefined);
});

test("VIN handoff shape: the decoded vehicle becomes the diagnose vehicle line", () => {
  assert.equal(
    buildVinVehicleInfo({
      year: "2019",
      make: "Honda",
      model: "Accord",
      trim: "EX-L",
      engine: "1.5L I4",
    }),
    "2019 Honda Accord EX-L (1.5L I4)",
  );
  assert.equal(
    buildVinVehicleInfo({ year: "2019", make: "Honda", model: "Accord", trim: null, engine: null }),
    "2019 Honda Accord",
  );
  const prefill = buildVinDiagnosisPrefill({
    year: "2019",
    make: "Honda",
    model: "Accord",
    trim: "EX-L",
    engine: null,
  });
  assert.equal(prefill.problem, "");
  assert.equal(prefill.vehicleInfo, "2019 Honda Accord EX-L");
});

test("photo result parsing: defensive against raw model output", () => {
  const clean = parseWarningLightResult(
    JSON.stringify({
      lights: [
        { name: "Oil Pressure Warning", meaning: "Oil pressure is low.", severity: "Critical" },
        { name: "Check Engine Light", meaning: "A fault code is stored.", severity: "weird-value" },
        { name: "", meaning: "nameless entries are dropped", severity: "Critical" },
      ],
      odometerMiles: 45210,
      note: "Engine running.",
    }),
  );
  assert.equal(clean.lights.length, 2);
  assert.equal(clean.lights[0].severity, "Critical");
  assert.equal(clean.lights[1].severity, "Moderate — Fix Soon", "unknown severity coerces to the middle");
  assert.equal(clean.odometerMiles, 45210);
  assert.equal(clean.note, "Engine running.");

  const wrapped = parseWarningLightResult(
    'Here is the reading: {"lights":[],"odometerMiles":-5,"note":""} done',
  );
  assert.equal(wrapped.lights.length, 0);
  assert.equal(wrapped.odometerMiles, null, "a negative odometer is never reported");

  assert.throws(() => parseWarningLightResult("no json here at all"));
});

/* ------------------------- Quota integrity ------------------------ */

test("photo identification consumes NO quota — triage is not a side door", async () => {
  const store = new MemoryIdentityStore();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail(DRIVER.email.toLowerCase());
  assert.ok(user);

  const vision = new StubWarningLightProvider();
  const result = await identifyWarningLights(vision, {
    imageBase64: "ZmFrZQ==",
    mediaType: "image/jpeg",
  });
  assert.equal(vision.calls.length, 1, "the provider was invoked exactly once");
  assert.equal(result.lights.length, 1);
  assert.ok(result.disclaimer.includes("not the fault underneath"));

  const after = await store.findUserById(user.id);
  assert.equal(after?.freeDiagnosesUsed, 0, "identification must never touch the quota");
});

test("scan→diagnose handoff consumes exactly one quota unit (code mode)", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail(DRIVER.email.toLowerCase());
  assert.ok(user);

  // Exactly what the code-mode handoff writes into the diagnose page.
  const prefill = buildCodeDiagnosisPrefill("P0420", "2019 Honda Accord");
  const events = await collect(
    executeDiagnosis({ store, provider }, { user, request: prefill }),
  );
  const done = events.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done);
  assert.equal(done.quota.remaining, 4, "5 → 4: exactly one consume");
  assert.equal(provider.calls.length, 1);
  assert.equal(provider.calls[0].problem, prefill.problem);
  assert.equal(provider.calls[0].vehicleInfo, "2019 Honda Accord");
  assert.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 1);
});

test("photo→diagnose: identification (0) + one diagnosis = exactly one consume", async () => {
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, DRIVER);
  const user = await store.findUserByEmail(DRIVER.email.toLowerCase());
  assert.ok(user);

  const vision = new StubWarningLightProvider();
  const identified = await identifyWarningLights(vision, {
    imageBase64: "ZmFrZQ==",
    mediaType: "image/png",
  });
  assert.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 0);

  const prefill = buildPhotoDiagnosisPrefill(identified.lights, "2019 Honda Accord");
  assert.ok(prefill.problem.includes("Check Engine Light"));
  const events = await collect(
    executeDiagnosis(
      { store, provider },
      { user: (await store.findUserById(user.id)) ?? user, request: prefill },
    ),
  );
  const done = events.find((e) => e.type === "done") as
    | Extract<DiagnoseServiceEvent, { type: "done" }>
    | undefined;
  assert.ok(done);
  assert.equal(done.quota.remaining, 4);
  assert.equal(provider.calls.length, 1, "one diagnosis call, not one per light");
  assert.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 1);
});

/* --------------------- Unauthenticated behavior ------------------- */

test("unauthenticated scan API gate: a tokenless request is refused 401", () => {
  const result = requireAuth(new Request("http://test.invalid/api/scan/photo", { method: "POST" }), [
    "driver",
  ]);
  assert.ok("response" in result, "no payload may leak to an anonymous caller");
  if ("response" in result) assert.equal(result.response.status, 401);
});

test("unauthenticated /app/scan contract: bounce to /login, return after auth", () => {
  const root = process.cwd();
  const scanPage = readFileSync(join(root, "app/app/scan/page.tsx"), "utf8");
  assert.ok(scanPage.includes("RETURN_TO_KEY"), "scan page saves a return-to");
  assert.ok(scanPage.includes('"/app/scan"'), "the return-to is the scan page itself");
  assert.ok(scanPage.includes('"/login"'), "unauthenticated visitors bounce to /login");

  for (const page of ["app/login/page.tsx", "app/register/page.tsx"]) {
    const source = readFileSync(join(root, page), "utf8");
    assert.ok(source.includes("RETURN_TO_KEY"), `${page} honors the return-to`);
    assert.ok(source.includes('startsWith("/app/")'), `${page} only honors in-app paths`);
  }

  const diagnosePage = readFileSync(join(root, "app/app/diagnose/page.tsx"), "utf8");
  assert.ok(diagnosePage.includes("DIAGNOSE_PREFILL_KEY"), "diagnose page reads the scan prefill");
  assert.ok(
    diagnosePage.includes("removeItem(DIAGNOSE_PREFILL_KEY)"),
    "the prefill is cleared on use so it can never leak into a later diagnosis",
  );
});

/* ------------------------- Route inventory ------------------------ */

function walk(dir: string, suffix: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, suffix));
    else if (entry.name.endsWith(suffix)) out.push(path);
  }
  return out;
}

test("route inventory: every internal href in the product maps to a real route", () => {
  const root = process.cwd();

  // The route set, derived from the app tree itself.
  const routes = new Set<string>();
  for (const page of walk(join(root, "app"), "page.tsx")) {
    const rel = page.slice(join(root, "app").length).replace(/\\/g, "/");
    const segments = rel
      .split("/")
      .filter(Boolean)
      .slice(0, -1) // drop page.tsx
      .map((seg) => (seg.startsWith("[") ? ":param" : seg));
    routes.add("/" + segments.join("/"));
  }
  // The bug this sweep exists to kill, pinned explicitly:
  assert.ok(routes.has("/app/scan"), "/app/scan must exist — the homepage hero links here");
  assert.ok(routes.has("/scan"), "/scan must exist — the QR-sticker landing");

  // Anchor ids declared anywhere in the UI source.
  const sourceFiles = [
    ...walk(join(root, "app"), ".tsx"),
    ...walk(join(root, "components"), ".tsx"),
    ...walk(join(root, "lib/client"), ".ts"),
  ];
  const anchorIds = new Set<string>();
  const sources = new Map<string, string>();
  for (const file of sourceFiles) {
    const text = readFileSync(file, "utf8");
    sources.set(file, text);
    for (const m of text.matchAll(/id="([^"]+)"/g)) anchorIds.add(m[1]);
  }

  const routeMatches = (path: string): boolean => {
    if (routes.has(path)) return true;
    const parts = path.split("/").filter(Boolean);
    for (const route of routes) {
      const rParts = route.split("/").filter(Boolean);
      if (rParts.length !== parts.length) continue;
      if (rParts.every((seg, i) => seg === ":param" || seg === parts[i])) return true;
    }
    return false;
  };

  const patterns: RegExp[] = [
    /href="(\/[^"]*)"/g,
    /href=\{"(\/[^"]*)"\}/g,
    /href=\{`(\/[^`]*)`\}/g,
    /(?:push|replace)\("(\/[^"]*)"\)/g,
    /location\.href = "(\/[^"]*)"/g,
    /setItem\([^,]+,\s*"(\/[^"]*)"\)/g,
    /href="#([^"]*)"/g,
    /href=\{`#([^`]*)`\}/g,
  ];

  const failures: string[] = [];
  let checked = 0;
  for (const [file, text] of sources) {
    const rel = file.slice(root.length + 1);
    for (const pattern of patterns) {
      for (const m of text.matchAll(pattern)) {
        let target = m[1];
        if (!target.startsWith("/") && !target.startsWith("#")) {
          // Anchor-only pattern: normalize to "/#anchor".
          target = "/#" + target;
        }
        if (target.startsWith("//")) continue; // protocol-relative, external
        const templated = target.replace(/\$\{[^}]*\}/g, ":param");
        const [rawPath, anchor] = templated.split("#");
        const path = rawPath.split("?")[0] || "/";
        if (path.startsWith("/api/")) continue; // API endpoints are not pages
        checked += 1;
        if (!routeMatches(path)) {
          failures.push(`${rel}: "${target}" — no route matches ${path}`);
          continue;
        }
        if (anchor && !anchorIds.has(anchor)) {
          failures.push(`${rel}: "${target}" — no element with id="${anchor}" exists`);
        }
      }
    }
  }

  assert.ok(checked >= 30, `the sweep should examine a real inventory (saw ${checked})`);
  assert.deepEqual(failures, [], `dead links found:\n${failures.join("\n")}`);
});
