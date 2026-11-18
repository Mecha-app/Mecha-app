"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "scan-test-secret";
const authService_1 = require("../lib/server/authService");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const provider_1 = require("../lib/server/provider");
const routeAuth_1 = require("../lib/server/routeAuth");
const scan_1 = require("../lib/server/scan");
const scanService_1 = require("../lib/server/scanService");
const store_1 = require("../lib/server/store");
const vision_1 = require("../lib/server/vision");
const DRIVER = {
    name: "Scan Tester",
    email: "scan@example.com",
    phone: "(617) 555-0177",
    password: "correct horse battery",
};
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
/* ------------------------- Code validation ------------------------ */
(0, node_test_1.test)("fault code validation: canonical codes accepted and normalized", () => {
    strict_1.default.equal((0, scan_1.validateFaultCode)("P0420"), "P0420");
    strict_1.default.equal((0, scan_1.validateFaultCode)("p0420"), "P0420");
    strict_1.default.equal((0, scan_1.validateFaultCode)("  P-0301 "), "P0301");
    strict_1.default.equal((0, scan_1.validateFaultCode)("B1234"), "B1234");
    strict_1.default.equal((0, scan_1.validateFaultCode)("C0561"), "C0561");
    strict_1.default.equal((0, scan_1.validateFaultCode)("U0100"), "U0100");
});
(0, node_test_1.test)("fault code validation: garbage is rejected, never guessed at", () => {
    for (const bad of ["", "P42", "P042", "P04200", "X0420", "P04G0", "12345", "PP420", "P042O0"]) {
        strict_1.default.equal((0, scan_1.validateFaultCode)(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
    }
});
(0, node_test_1.test)("fault code info: system and scope come from the code itself", () => {
    strict_1.default.deepEqual((0, scan_1.faultCodeInfo)("P0420"), {
        code: "P0420",
        system: "Powertrain",
        scope: "generic",
    });
    strict_1.default.equal((0, scan_1.faultCodeInfo)("P1420").scope, "manufacturer");
    strict_1.default.equal((0, scan_1.faultCodeInfo)("U0100").system, "Network");
    strict_1.default.equal((0, scan_1.faultCodeInfo)("C0561").system, "Chassis");
    strict_1.default.equal((0, scan_1.faultCodeInfo)("B1234").system, "Body");
});
/* --------------------------- Handoffs ----------------------------- */
(0, node_test_1.test)("code handoff prefill: names the code and carries the vehicle through", () => {
    const prefill = (0, scan_1.buildCodeDiagnosisPrefill)("P0420", "2019 Honda Accord");
    strict_1.default.ok(prefill.problem.includes("P0420"));
    strict_1.default.ok(prefill.problem.toLowerCase().includes("powertrain"));
    strict_1.default.equal(prefill.vehicleInfo, "2019 Honda Accord");
    const bare = (0, scan_1.buildCodeDiagnosisPrefill)("P0420");
    strict_1.default.equal(bare.vehicleInfo, undefined);
});
(0, node_test_1.test)("VIN handoff shape: the decoded vehicle becomes the diagnose vehicle line", () => {
    strict_1.default.equal((0, scan_1.buildVinVehicleInfo)({
        year: "2019",
        make: "Honda",
        model: "Accord",
        trim: "EX-L",
        engine: "1.5L I4",
    }), "2019 Honda Accord EX-L (1.5L I4)");
    strict_1.default.equal((0, scan_1.buildVinVehicleInfo)({ year: "2019", make: "Honda", model: "Accord", trim: null, engine: null }), "2019 Honda Accord");
    const prefill = (0, scan_1.buildVinDiagnosisPrefill)({
        year: "2019",
        make: "Honda",
        model: "Accord",
        trim: "EX-L",
        engine: null,
    });
    strict_1.default.equal(prefill.problem, "");
    strict_1.default.equal(prefill.vehicleInfo, "2019 Honda Accord EX-L");
});
(0, node_test_1.test)("photo result parsing: defensive against raw model output", () => {
    const clean = (0, scan_1.parseWarningLightResult)(JSON.stringify({
        lights: [
            { name: "Oil Pressure Warning", meaning: "Oil pressure is low.", severity: "Critical" },
            { name: "Check Engine Light", meaning: "A fault code is stored.", severity: "weird-value" },
            { name: "", meaning: "nameless entries are dropped", severity: "Critical" },
        ],
        odometerMiles: 45210,
        note: "Engine running.",
    }));
    strict_1.default.equal(clean.lights.length, 2);
    strict_1.default.equal(clean.lights[0].severity, "Critical");
    strict_1.default.equal(clean.lights[1].severity, "Moderate — Fix Soon", "unknown severity coerces to the middle");
    strict_1.default.equal(clean.odometerMiles, 45210);
    strict_1.default.equal(clean.note, "Engine running.");
    const wrapped = (0, scan_1.parseWarningLightResult)('Here is the reading: {"lights":[],"odometerMiles":-5,"note":""} done');
    strict_1.default.equal(wrapped.lights.length, 0);
    strict_1.default.equal(wrapped.odometerMiles, null, "a negative odometer is never reported");
    strict_1.default.throws(() => (0, scan_1.parseWarningLightResult)("no json here at all"));
});
/* ------------------------- Quota integrity ------------------------ */
(0, node_test_1.test)("photo identification consumes NO quota — triage is not a side door", async () => {
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email.toLowerCase());
    strict_1.default.ok(user);
    const vision = new vision_1.StubWarningLightProvider();
    const result = await (0, scanService_1.identifyWarningLights)(vision, {
        imageBase64: "ZmFrZQ==",
        mediaType: "image/jpeg",
    });
    strict_1.default.equal(vision.calls.length, 1, "the provider was invoked exactly once");
    strict_1.default.equal(result.lights.length, 1);
    strict_1.default.ok(result.disclaimer.includes("not the fault underneath"));
    const after = await store.findUserById(user.id);
    strict_1.default.equal(after?.freeDiagnosesUsed, 0, "identification must never touch the quota");
});
(0, node_test_1.test)("scan→diagnose handoff consumes exactly one quota unit (code mode)", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email.toLowerCase());
    strict_1.default.ok(user);
    // Exactly what the code-mode handoff writes into the diagnose page.
    const prefill = (0, scan_1.buildCodeDiagnosisPrefill)("P0420", "2019 Honda Accord");
    const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: prefill }));
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done);
    strict_1.default.equal(done.quota.remaining, 4, "5 → 4: exactly one consume");
    strict_1.default.equal(provider.calls.length, 1);
    strict_1.default.equal(provider.calls[0].problem, prefill.problem);
    strict_1.default.equal(provider.calls[0].vehicleInfo, "2019 Honda Accord");
    strict_1.default.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 1);
});
(0, node_test_1.test)("photo→diagnose: identification (0) + one diagnosis = exactly one consume", async () => {
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, DRIVER);
    const user = await store.findUserByEmail(DRIVER.email.toLowerCase());
    strict_1.default.ok(user);
    const vision = new vision_1.StubWarningLightProvider();
    const identified = await (0, scanService_1.identifyWarningLights)(vision, {
        imageBase64: "ZmFrZQ==",
        mediaType: "image/png",
    });
    strict_1.default.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 0);
    const prefill = (0, scan_1.buildPhotoDiagnosisPrefill)(identified.lights, "2019 Honda Accord");
    strict_1.default.ok(prefill.problem.includes("Check Engine Light"));
    const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user: (await store.findUserById(user.id)) ?? user, request: prefill }));
    const done = events.find((e) => e.type === "done");
    strict_1.default.ok(done);
    strict_1.default.equal(done.quota.remaining, 4);
    strict_1.default.equal(provider.calls.length, 1, "one diagnosis call, not one per light");
    strict_1.default.equal((await store.findUserById(user.id))?.freeDiagnosesUsed, 1);
});
/* --------------------- Unauthenticated behavior ------------------- */
(0, node_test_1.test)("unauthenticated scan API gate: a tokenless request is refused 401", () => {
    const result = (0, routeAuth_1.requireAuth)(new Request("http://test.invalid/api/scan/photo", { method: "POST" }), [
        "driver",
    ]);
    strict_1.default.ok("response" in result, "no payload may leak to an anonymous caller");
    if ("response" in result)
        strict_1.default.equal(result.response.status, 401);
});
(0, node_test_1.test)("unauthenticated /app/scan contract: bounce to /login, return after auth", () => {
    const root = process.cwd();
    const scanPage = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "app/app/scan/page.tsx"), "utf8");
    strict_1.default.ok(scanPage.includes("RETURN_TO_KEY"), "scan page saves a return-to");
    strict_1.default.ok(scanPage.includes('"/app/scan"'), "the return-to is the scan page itself");
    strict_1.default.ok(scanPage.includes('"/login"'), "unauthenticated visitors bounce to /login");
    for (const page of ["app/login/page.tsx", "app/register/page.tsx"]) {
        const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, page), "utf8");
        strict_1.default.ok(source.includes("RETURN_TO_KEY"), `${page} honors the return-to`);
        strict_1.default.ok(source.includes('startsWith("/app/")'), `${page} only honors in-app paths`);
    }
    const diagnosePage = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "app/app/diagnose/page.tsx"), "utf8");
    strict_1.default.ok(diagnosePage.includes("DIAGNOSE_PREFILL_KEY"), "diagnose page reads the scan prefill");
    strict_1.default.ok(diagnosePage.includes("removeItem(DIAGNOSE_PREFILL_KEY)"), "the prefill is cleared on use so it can never leak into a later diagnosis");
});
/* ------------------------- Route inventory ------------------------ */
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
(0, node_test_1.test)("route inventory: every internal href in the product maps to a real route", () => {
    const root = process.cwd();
    // The route set, derived from the app tree itself.
    const routes = new Set();
    for (const page of walk((0, node_path_1.join)(root, "app"), "page.tsx")) {
        const rel = page.slice((0, node_path_1.join)(root, "app").length).replace(/\\/g, "/");
        const segments = rel
            .split("/")
            .filter(Boolean)
            .slice(0, -1) // drop page.tsx
            .map((seg) => (seg.startsWith("[") ? ":param" : seg));
        routes.add("/" + segments.join("/"));
    }
    // The bug this sweep exists to kill, pinned explicitly:
    strict_1.default.ok(routes.has("/app/scan"), "/app/scan must exist — the homepage hero links here");
    strict_1.default.ok(routes.has("/scan"), "/scan must exist — the QR-sticker landing");
    // Anchor ids declared anywhere in the UI source.
    const sourceFiles = [
        ...walk((0, node_path_1.join)(root, "app"), ".tsx"),
        ...walk((0, node_path_1.join)(root, "components"), ".tsx"),
        ...walk((0, node_path_1.join)(root, "lib/client"), ".ts"),
    ];
    const anchorIds = new Set();
    const sources = new Map();
    for (const file of sourceFiles) {
        const text = (0, node_fs_1.readFileSync)(file, "utf8");
        sources.set(file, text);
        for (const m of text.matchAll(/id="([^"]+)"/g))
            anchorIds.add(m[1]);
    }
    const routeMatches = (path) => {
        if (routes.has(path))
            return true;
        const parts = path.split("/").filter(Boolean);
        for (const route of routes) {
            const rParts = route.split("/").filter(Boolean);
            if (rParts.length !== parts.length)
                continue;
            if (rParts.every((seg, i) => seg === ":param" || seg === parts[i]))
                return true;
        }
        return false;
    };
    const patterns = [
        /href="(\/[^"]*)"/g,
        /href=\{"(\/[^"]*)"\}/g,
        /href=\{`(\/[^`]*)`\}/g,
        /(?:push|replace)\("(\/[^"]*)"\)/g,
        /location\.href = "(\/[^"]*)"/g,
        /setItem\([^,]+,\s*"(\/[^"]*)"\)/g,
        /href="#([^"]*)"/g,
        /href=\{`#([^`]*)`\}/g,
    ];
    const failures = [];
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
                if (target.startsWith("//"))
                    continue; // protocol-relative, external
                const templated = target.replace(/\$\{[^}]*\}/g, ":param");
                const [rawPath, anchor] = templated.split("#");
                const path = rawPath.split("?")[0] || "/";
                if (path.startsWith("/api/"))
                    continue; // API endpoints are not pages
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
    strict_1.default.ok(checked >= 30, `the sweep should examine a real inventory (saw ${checked})`);
    strict_1.default.deepEqual(failures, [], `dead links found:\n${failures.join("\n")}`);
});
