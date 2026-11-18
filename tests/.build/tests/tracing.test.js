"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Langfuse tracing tests (tool stack P1).
 *
 * Pins the module's two contracts:
 *  1. ENV-GATED — no LANGFUSE_* keys → isTracingConfigured() is false and
 *     the trace handle is a true no-op (the diagnosis path is untouched).
 *  2. NEVER FATAL — executeDiagnosis behaves identically with tracing
 *     unwired: success streams a done event, and a provider failure
 *     still propagates to the caller (recordError must not swallow it).
 *
 * No real Langfuse account or network call is involved.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "tracing-test-secret";
const authService_1 = require("../lib/server/authService");
const ai_1 = require("../lib/server/ai");
const diagnoseService_1 = require("../lib/server/diagnoseService");
const provider_1 = require("../lib/server/provider");
const store_1 = require("../lib/server/store");
const tracing_1 = require("../lib/server/tracing");
const LANGFUSE_KEYS = ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"];
function clearLangfuseEnv() {
    for (const key of LANGFUSE_KEYS)
        delete process.env[key];
}
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
(0, node_test_1.test)("tracing is configured only with BOTH Langfuse keys", () => {
    strict_1.default.equal((0, tracing_1.isTracingConfigured)({}), false);
    strict_1.default.equal((0, tracing_1.isTracingConfigured)({ LANGFUSE_PUBLIC_KEY: "pk" }), false);
    strict_1.default.equal((0, tracing_1.isTracingConfigured)({ LANGFUSE_SECRET_KEY: "sk" }), false);
    strict_1.default.equal((0, tracing_1.isTracingConfigured)({ LANGFUSE_PUBLIC_KEY: "pk", LANGFUSE_SECRET_KEY: "sk" }), true);
});
(0, node_test_1.test)("unwired trace handle is a no-op that always resolves", async () => {
    clearLangfuseEnv();
    const trace = (0, tracing_1.startDiagnosisTrace)({
        userId: "user-1",
        tier: "triage",
        promptVersion: ai_1.DIAGNOSIS_PROMPT_VERSION,
        prompt: "prompt",
    });
    await trace.recordSuccess({
        model: "stub-model",
        report: {
            severity: "Minor — Monitor",
            safeToDriver: true,
            diagnosis: "Nothing serious.",
            estimatedCost: null,
            laborHours: null,
            parts: [],
            steps: [],
            tip: "",
            disclaimer: "",
        },
        latency: { ttftMs: 1, totalMs: 2 },
    });
    await trace.recordError(new Error("boom"));
});
(0, node_test_1.test)("diagnosis flow is unchanged with tracing unwired (success)", async () => {
    clearLangfuseEnv();
    const store = new store_1.MemoryIdentityStore();
    const provider = new provider_1.StubDiagnosisProvider();
    await (0, authService_1.registerDriver)(store, {
        name: "Trace Driver",
        email: "trace@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    const user = await store.findUserByEmail("trace@example.com");
    strict_1.default.ok(user);
    const events = await collect((0, diagnoseService_1.executeDiagnosis)({ store, provider }, { user, request: { problem: "Squeak when I turn the wheel" } }));
    const done = events.filter((e) => e.type === "done");
    strict_1.default.equal(done.length, 1, "exactly one done event");
    strict_1.default.equal(provider.calls.length, 1);
});
class FailingProvider {
    name = "failing";
    async *stream() {
        throw new Error("provider_boom");
    }
}
(0, node_test_1.test)("provider failure still propagates with tracing unwired", async () => {
    clearLangfuseEnv();
    const store = new store_1.MemoryIdentityStore();
    await (0, authService_1.registerDriver)(store, {
        name: "Fail Driver",
        email: "fail@example.com",
        phone: "(617) 555-0134",
        password: "correct horse battery",
    });
    const user = await store.findUserByEmail("fail@example.com");
    strict_1.default.ok(user);
    await strict_1.default.rejects(collect((0, diagnoseService_1.executeDiagnosis)({ store, provider: new FailingProvider() }, { user, request: { problem: "Engine will not start" } })), /provider_boom/);
});
