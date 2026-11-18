"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * OpenRouter provider tests.
 *
 * The network is replaced with a recorded OpenAI-compatible SSE
 * fixture: no real OpenRouter account, key, or paid call is involved.
 * These tests pin the provider contract shared with Anthropic —
 * streamed deltas, the same prompt/parser behavior, typed unwired
 * handling before fetch, max-token parity, and env-only selection.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const parts_1 = require("../lib/server/parts");
const provider_1 = require("../lib/server/provider");
const ENV_KEYS = [
    "AI_PROVIDER",
    "ANTHROPIC_API_KEY",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL_TRIAGE",
    "OPENROUTER_MODEL_DEEP",
];
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
function clearProviderEnv() {
    for (const key of ENV_KEYS)
        delete process.env[key];
}
const fetchCalls = [];
const originalFetch = globalThis.fetch;
function installFetchFixture(body) {
    fetchCalls.length = 0;
    globalThis.fetch = async (url, init) => {
        fetchCalls.push({ url, init });
        return new Response(body, {
            status: 200,
            headers: { "content-type": "text/event-stream" },
        });
    };
}
function restoreFetch() {
    globalThis.fetch = originalFetch;
}
function recordedSseFixture(text) {
    // Split the report unevenly, as a real token stream would, while
    // retaining an exact recorded-chat-completions SSE shape.
    const chunks = [text.slice(0, 17), text.slice(17, 61), text.slice(61)];
    const lines = [": openrouter recorded fixture"];
    for (const chunk of chunks) {
        lines.push(`data: ${JSON.stringify({
            id: "gen-recorded-fixture",
            model: provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL,
            choices: [{ index: 0, delta: { role: "assistant", content: chunk } }],
        })}`);
    }
    lines.push("data: [DONE]", "");
    return lines.join("\n");
}
async function collect(gen) {
    const events = [];
    for await (const event of gen)
        events.push(event);
    return events;
}
(0, node_test_1.test)("OpenRouter streams recorded SSE deltas and parses the shared report", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    installFetchFixture(recordedSseFixture(provider_1.STUB_REPORT_JSON));
    try {
        const provider = new provider_1.OpenRouterProvider();
        const events = await collect(provider.stream({
            problem: "Grinding noise when I brake",
            vehicleInfo: "2019 Honda Accord",
            language: "en",
        }));
        const deltas = events.filter((event) => event.type === "delta");
        strict_1.default.equal(deltas.map((event) => (event.type === "delta" ? event.text : "")).join(""), provider_1.STUB_REPORT_JSON, "delta events must reconstruct the model text exactly");
        const done = events.find((event) => event.type === "done");
        strict_1.default.ok(done && done.type === "done");
        strict_1.default.equal(done.model, provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL);
        strict_1.default.equal(done.model, "deepseek/deepseek-chat");
        strict_1.default.equal(done.tier, "triage");
        strict_1.default.equal(done.report.severity, "Moderate — Fix Soon");
        strict_1.default.equal(done.report.safeToDriver, true);
        strict_1.default.ok(done.report.diagnosis.includes("worn brake pads"));
        strict_1.default.equal(done.report.parts[0].name, "Brake pads (front set)");
        strict_1.default.ok(done.latency.totalMs >= done.latency.ttftMs);
        strict_1.default.equal(fetchCalls.length, 1);
        strict_1.default.equal(fetchCalls[0].url, "https://openrouter.ai/api/v1/chat/completions");
        strict_1.default.equal(fetchCalls[0].init?.method, "POST");
        const headers = fetchCalls[0].init?.headers;
        strict_1.default.equal(headers.authorization, `Bearer ${process.env.OPENROUTER_API_KEY}`);
        strict_1.default.equal(headers["content-type"], "application/json");
        const body = JSON.parse(String(fetchCalls[0].init?.body));
        strict_1.default.equal(body.model, provider_1.OPENROUTER_DEFAULT_TRIAGE_MODEL);
        strict_1.default.equal(body.max_tokens, 1500, "triage keeps Anthropic token parity");
        strict_1.default.equal(body.stream, true);
        strict_1.default.equal(body.messages.length, 1);
        strict_1.default.equal(body.messages[0].role, "user");
        strict_1.default.ok(body.messages[0].content.includes("Vehicle: 2019 Honda Accord"));
        strict_1.default.ok(body.messages[0].content.includes("Problem: Grinding noise when I brake"));
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter deep tier honors its model override and token parity", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    process.env.OPENROUTER_MODEL_DEEP = "example/deep-eval-model";
    installFetchFixture(recordedSseFixture(provider_1.STUB_REPORT_JSON));
    try {
        const events = await collect(new provider_1.OpenRouterProvider().stream({ problem: "Deep check", tier: "deep" }));
        const done = events.find((event) => event.type === "done");
        strict_1.default.ok(done && done.type === "done");
        strict_1.default.equal(done.model, "example/deep-eval-model");
        strict_1.default.equal(done.tier, "deep");
        strict_1.default.equal(provider_1.OPENROUTER_DEFAULT_DEEP_MODEL, "anthropic/claude-sonnet-4.5");
        const body = JSON.parse(String(fetchCalls[0].init?.body));
        strict_1.default.equal(body.model, "example/deep-eval-model");
        strict_1.default.equal(body.max_tokens, 4000, "deep keeps Anthropic token parity");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter missing key throws the typed error before any fetch", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    installFetchFixture(recordedSseFixture(provider_1.STUB_REPORT_JSON));
    try {
        await strict_1.default.rejects(collect(new provider_1.OpenRouterProvider().stream({ problem: "Will not run" })), (err) => {
            strict_1.default.ok(err instanceof provider_1.OpenRouterNotConfiguredError);
            strict_1.default.equal(err.code, "ai_not_configured");
            strict_1.default.ok(err.message.includes("OPENROUTER_API_KEY is not set"));
            return true;
        });
        strict_1.default.equal(fetchCalls.length, 0, "an unwired provider must never call the network");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("provider selection defaults to Anthropic and switches only on AI_PROVIDER", () => {
    const env = snapshotEnv();
    clearProviderEnv();
    try {
        strict_1.default.equal((0, provider_1.getDiagnosisProvider)(), null, "no configured provider returns null");
        process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
        const fallback = (0, provider_1.getDiagnosisProvider)();
        strict_1.default.ok(fallback instanceof provider_1.AnthropicStreamingProvider);
        strict_1.default.equal(fallback.name, "anthropic");
        process.env.AI_PROVIDER = "openrouter";
        strict_1.default.equal((0, provider_1.getDiagnosisProvider)(), null, "explicit OpenRouter selection must not silently fall back when its key is absent");
        process.env.OPENROUTER_API_KEY = "openrouter-test-key";
        const selected = (0, provider_1.getDiagnosisProvider)();
        strict_1.default.ok(selected instanceof provider_1.OpenRouterProvider);
        strict_1.default.equal(selected.name, "openrouter");
        process.env.AI_PROVIDER = " OPENROUTER ";
        strict_1.default.ok((0, provider_1.getDiagnosisProvider)() instanceof provider_1.OpenRouterProvider);
        delete process.env.AI_PROVIDER;
        strict_1.default.ok((0, provider_1.getDiagnosisProvider)() instanceof provider_1.AnthropicStreamingProvider, "unsetting AI_PROVIDER restores the historical Anthropic default");
    }
    finally {
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter output feeds parts unchanged; provider and downstream layers stay decoupled", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    installFetchFixture(recordedSseFixture(provider_1.STUB_REPORT_JSON));
    try {
        const events = await collect(new provider_1.OpenRouterProvider().stream({
            problem: "Grinding noise when I brake",
            vehicleInfo: "2019 Honda Accord",
        }));
        const done = events.find((event) => event.type === "done");
        strict_1.default.ok(done && done.type === "done");
        const block = (0, parts_1.buildPartsBlock)({
            diagnosis: done.report,
            vehicle: { vehicleInfo: "2019 Honda Accord" },
        });
        strict_1.default.equal(block.disclosure, parts_1.PARTS_DISCLOSURE);
        strict_1.default.equal(block.discountNote, null);
        strict_1.default.equal(block.parts[0].name, "Brake pads (front set)");
        strict_1.default.ok(block.parts[0].links.length >= 3);
        for (const link of block.parts[0].links) {
            const url = decodeURIComponent(link.url);
            strict_1.default.ok(url.includes("2019 Honda Accord"));
            strict_1.default.ok(url.includes("Brake pads (front set)"));
        }
        const root = process.cwd();
        const providerSrc = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "lib/server/provider.ts"), "utf8");
        const partsSrc = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "lib/server/parts.ts"), "utf8");
        const fairPriceSrc = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/FairPriceQuote.tsx"), "utf8");
        strict_1.default.ok(!providerSrc.includes('from "./parts"'), "provider must not import parts");
        strict_1.default.ok(!partsSrc.includes('from "./provider"'), "parts must not import provider");
        strict_1.default.ok(!fairPriceSrc.includes("OpenRouterProvider"), "fair-price rendering must not depend on the diagnosis provider");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
