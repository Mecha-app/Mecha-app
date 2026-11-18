"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Vercel AI SDK provider tests (tool stack P1).
 *
 * The network is replaced with a recorded OpenAI-compatible SSE
 * fixture — the same shape the raw OpenRouter provider is tested
 * against — so no real OpenRouter account, key, or paid call exists.
 * Pinned behavior:
 *  1. The SDK engine streams deltas and parses the shared report.
 *  2. Selection: AI_ENGINE=sdk opts in ONLY alongside
 *     AI_PROVIDER=openrouter; every other configuration resolves
 *     exactly as provider.ts always has (raw providers).
 *  3. Unwired discipline: explicit SDK selection with no key → null
 *     from the factory, and a direct stream() throws the typed
 *     not-configured error BEFORE any fetch.
 *  4. Fallback: an SDK failure before the first token restarts on the
 *     raw provider; a failure after tokens streamed is NOT masked.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const provider_1 = require("../lib/server/provider");
const providerAiSdk_1 = require("../lib/server/providerAiSdk");
const ENV_KEYS = ["AI_PROVIDER", "AI_ENGINE", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"];
function snapshotEnv() {
    return new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
}
function restoreEnv(snapshot) {
    for (const key of ENV_KEYS) {
        const value = snapshot.get(key);
        if (value === undefined)
            delete process.env[key];
        else
            process.env[key] = value;
    }
}
function clearEnv() {
    for (const key of ENV_KEYS)
        delete process.env[key];
}
const fetchCalls = [];
const originalFetch = globalThis.fetch;
function setFetch(fn) {
    fetchCalls.length = 0;
    globalThis.fetch = async (url, init) => {
        fetchCalls.push({ url, init });
        return fn(url, init);
    };
}
function restoreFetch() {
    globalThis.fetch = originalFetch;
}
function recordedSseFixture(text, withUsage = false) {
    const chunks = [text.slice(0, 17), text.slice(17, 61), text.slice(61)];
    const lines = [": openrouter recorded fixture"];
    for (const chunk of chunks) {
        lines.push(`data: ${JSON.stringify({
            id: "gen-recorded-fixture",
            model: provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL,
            choices: [{ index: 0, delta: { role: "assistant", content: chunk } }],
        })}`);
    }
    if (withUsage) {
        lines.push(`data: ${JSON.stringify({
            id: "gen-recorded-fixture",
            model: provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL,
            choices: [],
            usage: { prompt_tokens: 321, completion_tokens: 87 },
        })}`);
    }
    lines.push("data: [DONE]", "");
    return lines.join("\n");
}
function sseResponse(body) {
    return new Response(body, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
    });
}
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
function doneOf(events) {
    const done = events.filter((e) => e.type === "done");
    strict_1.default.equal(done.length, 1, "exactly one done event");
    return done[0];
}
(0, node_test_1.test)("engine selection: sdk only when AI_ENGINE=sdk", () => {
    strict_1.default.equal((0, providerAiSdk_1.selectedAiEngine)({}), "raw");
    strict_1.default.equal((0, providerAiSdk_1.selectedAiEngine)({ AI_ENGINE: "raw" }), "raw");
    strict_1.default.equal((0, providerAiSdk_1.selectedAiEngine)({ AI_ENGINE: "sdk" }), "sdk");
    strict_1.default.equal((0, providerAiSdk_1.selectedAiEngine)({ AI_ENGINE: " SDK " }), "sdk");
});
(0, node_test_1.test)("factory: default selection is unchanged (raw providers)", () => {
    const env = snapshotEnv();
    clearEnv();
    try {
        process.env.AI_PROVIDER = "openrouter";
        process.env.OPENROUTER_API_KEY = "test-key";
        strict_1.default.ok((0, providerAiSdk_1.getActiveDiagnosisProvider)() instanceof provider_1.OpenRouterProvider, "no AI_ENGINE → raw OpenRouter provider");
        delete process.env.AI_PROVIDER;
        delete process.env.OPENROUTER_API_KEY;
        process.env.ANTHROPIC_API_KEY = "test-key";
        strict_1.default.ok((0, providerAiSdk_1.getActiveDiagnosisProvider)() instanceof provider_1.AnthropicStreamingProvider, "no AI_PROVIDER → Anthropic default");
    }
    finally {
        restoreEnv(env);
    }
});
(0, node_test_1.test)("factory: AI_ENGINE=sdk selects the SDK provider; unwired → null", () => {
    const env = snapshotEnv();
    clearEnv();
    try {
        process.env.AI_PROVIDER = "openrouter";
        process.env.AI_ENGINE = "sdk";
        strict_1.default.equal((0, providerAiSdk_1.getActiveDiagnosisProvider)(), null, "sdk selected but no key → null");
        process.env.OPENROUTER_API_KEY = "test-key";
        strict_1.default.ok((0, providerAiSdk_1.getActiveDiagnosisProvider)() instanceof providerAiSdk_1.AiSdkOpenRouterProvider);
    }
    finally {
        restoreEnv(env);
    }
});
(0, node_test_1.test)("SDK provider streams the recorded fixture and parses the shared report", async () => {
    const env = snapshotEnv();
    clearEnv();
    try {
        process.env.OPENROUTER_API_KEY = "test-key";
        setFetch(async () => sseResponse(recordedSseFixture(provider_1.STUB_REPORT_JSON, true)));
        const provider = new providerAiSdk_1.AiSdkOpenRouterProvider(new provider_1.OpenRouterProvider());
        const events = await collect(provider.stream({ problem: "Grinding noise when I brake", vehicleInfo: "2019 Honda Accord" }));
        const deltas = events
            .filter((e) => e.type === "delta")
            .map((e) => e.text)
            .join("");
        strict_1.default.equal(deltas, provider_1.STUB_REPORT_JSON, "deltas reconstruct the report JSON");
        const done = doneOf(events);
        strict_1.default.equal(done.model, provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL);
        strict_1.default.equal(done.tier, "triage");
        strict_1.default.ok(done.report.diagnosis.includes("worn brake pads"));
        strict_1.default.ok(fetchCalls.length >= 1, "the SDK made its HTTP call");
        strict_1.default.ok(String(fetchCalls[0].url).includes("openrouter.ai"));
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("SDK provider throws the typed unwired error before any fetch", async () => {
    const env = snapshotEnv();
    clearEnv();
    try {
        setFetch(async () => sseResponse(recordedSseFixture(provider_1.STUB_REPORT_JSON)));
        const provider = new providerAiSdk_1.AiSdkOpenRouterProvider(new provider_1.OpenRouterProvider());
        await strict_1.default.rejects(collect(provider.stream({ problem: "Anything" })), (err) => {
            strict_1.default.ok(err instanceof provider_1.OpenRouterNotConfiguredError);
            return true;
        });
        strict_1.default.equal(fetchCalls.length, 0, "no fetch attempted while unwired");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("fallback: SDK failure before the first token restarts on the raw provider", async () => {
    const env = snapshotEnv();
    clearEnv();
    try {
        process.env.OPENROUTER_API_KEY = "test-key";
        let call = 0;
        setFetch(async () => {
            call += 1;
            if (call === 1)
                return new Response("upstream down", { status: 500 });
            return sseResponse(recordedSseFixture(provider_1.STUB_REPORT_JSON));
        });
        const provider = new providerAiSdk_1.AiSdkOpenRouterProvider(new provider_1.OpenRouterProvider());
        const events = await collect(provider.stream({ problem: "Grinding noise when I brake" }));
        const done = doneOf(events);
        strict_1.default.equal(done.model, provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL);
        strict_1.default.equal(fetchCalls.length, 2, "SDK attempt + raw fallback attempt");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("no masking: a failure after tokens streamed surfaces, no fallback restart", async () => {
    const env = snapshotEnv();
    clearEnv();
    try {
        process.env.OPENROUTER_API_KEY = "test-key";
        const firstChunk = `data: ${JSON.stringify({
            id: "gen-partial",
            model: provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL,
            choices: [{ index: 0, delta: { role: "assistant", content: provider_1.STUB_REPORT_JSON.slice(0, 17) } }],
        })}\n\n`;
        setFetch(async () => {
            // Pull-based: the first chunk is actually delivered to (and read
            // by) the consumer before the failure — an error enqueued in the
            // same tick as the chunk races ahead of it and no delta would
            // ever surface, which is the pre-token case, not this one.
            let sent = false;
            const stream = new ReadableStream({
                pull(controller) {
                    if (!sent) {
                        sent = true;
                        controller.enqueue(new TextEncoder().encode(firstChunk));
                        return;
                    }
                    return new Promise((resolve) => setTimeout(() => {
                        controller.error(new Error("stream_broke"));
                        resolve();
                    }, 50));
                },
            });
            return new Response(stream, {
                status: 200,
                headers: { "content-type": "text/event-stream" },
            });
        });
        const provider = new providerAiSdk_1.AiSdkOpenRouterProvider(new provider_1.OpenRouterProvider());
        await strict_1.default.rejects(collect(provider.stream({ problem: "Grinding noise" })));
        strict_1.default.equal(fetchCalls.length, 1, "no fallback fetch after tokens streamed");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
