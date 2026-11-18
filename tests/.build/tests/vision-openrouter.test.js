"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * OpenRouter vision tests — the dashboard-photo reader follows the
 * same provider selection as the diagnosis engine.
 *
 * The network is replaced with a recorded chat-completions fixture:
 * no real OpenRouter account, key, or paid call is involved. These
 * tests pin: selection follows AI_PROVIDER exactly (explicit
 * OpenRouter never falls back silently to Anthropic; an
 * OpenRouter-only environment is "configured" for vision), the
 * OpenRouter request shape (endpoint, Bearer auth, data-URL image,
 * shared warning-light prompt, token parity with the Anthropic
 * reader), success parsing through the shared parser, and non-OK /
 * unparseable answers mapping to VisionProviderError.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const vision_1 = require("../lib/server/vision");
const ENV_KEYS = [
    "AI_PROVIDER",
    "ANTHROPIC_API_KEY",
    "OPENROUTER_API_KEY",
    "MECHA_MODEL_VISION_OPENROUTER",
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
function installFetch(response) {
    fetchCalls.length = 0;
    globalThis.fetch = async (url, init) => {
        fetchCalls.push({ url, init });
        return response;
    };
}
function restoreFetch() {
    globalThis.fetch = originalFetch;
}
const RESULT_JSON = JSON.stringify({
    lights: [
        {
            name: "Check Engine Light",
            meaning: "The engine computer has stored a fault code.",
            severity: "Moderate — Fix Soon",
        },
        {
            name: "Oil Pressure Warning",
            meaning: "Oil pressure is low — stop the engine as soon as it is safe.",
            severity: "Critical",
        },
    ],
    odometerMiles: 45210,
    note: "Engine running.",
});
function chatCompletion(content) {
    return new Response(JSON.stringify({
        id: "gen-vision-fixture",
        model: vision_1.OPENROUTER_VISION_MODEL_DEFAULT,
        choices: [{ index: 0, message: { role: "assistant", content } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
}
const IMAGE = { imageBase64: "ZmFrZS1pbWFnZQ==", mediaType: "image/jpeg" };
(0, node_test_1.test)("vision selection follows AI_PROVIDER: OpenRouter wins when explicitly selected", () => {
    const env = snapshotEnv();
    clearProviderEnv();
    try {
        strict_1.default.equal((0, vision_1.getWarningLightProvider)(), null, "no configured provider returns null");
        process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
        const fallback = (0, vision_1.getWarningLightProvider)();
        strict_1.default.ok(fallback instanceof vision_1.AnthropicVisionProvider, "default stays Anthropic");
        process.env.AI_PROVIDER = "openrouter";
        strict_1.default.equal((0, vision_1.getWarningLightProvider)(), null, "explicit OpenRouter selection must not silently fall back when its key is absent");
        process.env.OPENROUTER_API_KEY = "openrouter-test-key";
        const selected = (0, vision_1.getWarningLightProvider)();
        strict_1.default.ok(selected instanceof vision_1.OpenRouterVisionProvider, "an OpenRouter-only key set is configured for vision");
        delete process.env.ANTHROPIC_API_KEY;
        strict_1.default.ok((0, vision_1.getWarningLightProvider)() instanceof vision_1.OpenRouterVisionProvider, "vision stays wired with no Anthropic key at all");
        delete process.env.AI_PROVIDER;
        strict_1.default.equal((0, vision_1.getWarningLightProvider)(), null, "unsetting AI_PROVIDER restores the Anthropic default — and its missing key is unwired");
    }
    finally {
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter vision: request shape and success parsing into lights", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    installFetch(chatCompletion(RESULT_JSON));
    try {
        const provider = new vision_1.OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
        const result = await provider.identify(IMAGE);
        strict_1.default.equal(result.lights.length, 2);
        strict_1.default.equal(result.lights[0].name, "Check Engine Light");
        strict_1.default.equal(result.lights[0].severity, "Moderate — Fix Soon");
        strict_1.default.equal(result.lights[1].name, "Oil Pressure Warning");
        strict_1.default.equal(result.lights[1].severity, "Critical");
        strict_1.default.equal(result.odometerMiles, 45210);
        strict_1.default.equal(result.note, "Engine running.");
        strict_1.default.equal(fetchCalls.length, 1);
        strict_1.default.equal(fetchCalls[0].url, "https://openrouter.ai/api/v1/chat/completions");
        strict_1.default.equal(fetchCalls[0].init?.method, "POST");
        const headers = fetchCalls[0].init?.headers;
        strict_1.default.equal(headers.authorization, "Bearer openrouter-test-key");
        strict_1.default.equal(headers["content-type"], "application/json");
        const body = JSON.parse(String(fetchCalls[0].init?.body));
        strict_1.default.equal(body.model, vision_1.OPENROUTER_VISION_MODEL_DEFAULT);
        strict_1.default.equal(body.model, "anthropic/claude-haiku-4.5");
        strict_1.default.equal(body.max_tokens, 1200, "keeps the Anthropic reader's token parity");
        strict_1.default.equal(body.messages.length, 1);
        strict_1.default.equal(body.messages[0].role, "user");
        strict_1.default.equal(body.messages[0].content.length, 2);
        const [textPart, imagePart] = body.messages[0].content;
        strict_1.default.equal(textPart.type, "text");
        if (textPart.type === "text") {
            strict_1.default.ok(textPart.text.length > 0, "the shared warning-light prompt is sent");
        }
        strict_1.default.equal(imagePart.type, "image_url");
        if (imagePart.type === "image_url") {
            strict_1.default.equal(imagePart.image_url.url, `data:image/jpeg;base64,${IMAGE.imageBase64}`, "the photo travels as a data URL, never stored");
        }
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter vision: model override is honored", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    process.env.MECHA_MODEL_VISION_OPENROUTER = "example/vision-eval-model";
    installFetch(chatCompletion(RESULT_JSON));
    try {
        const provider = new vision_1.OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
        await provider.identify(IMAGE);
        const body = JSON.parse(String(fetchCalls[0].init?.body));
        strict_1.default.equal(body.model, "example/vision-eval-model");
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter vision: non-OK status maps to VisionProviderError with the status", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    installFetch(new Response("insufficient credits", { status: 402 }));
    try {
        const provider = new vision_1.OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
        await strict_1.default.rejects(provider.identify(IMAGE), (err) => {
            strict_1.default.ok(err instanceof vision_1.VisionProviderError);
            strict_1.default.equal(err.code, "vision_failed");
            strict_1.default.ok(err.message.includes("402"), "the HTTP status rides the error, like Anthropic's");
            return true;
        });
        strict_1.default.equal(fetchCalls.length, 1);
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
(0, node_test_1.test)("OpenRouter vision: an unparseable answer maps to VisionProviderError", async () => {
    const env = snapshotEnv();
    clearProviderEnv();
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    installFetch(chatCompletion("I cannot make out any lights in this photo."));
    try {
        const provider = new vision_1.OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
        await strict_1.default.rejects(provider.identify(IMAGE), (err) => {
            strict_1.default.ok(err instanceof vision_1.VisionProviderError);
            strict_1.default.equal(err.code, "vision_failed");
            return true;
        });
    }
    finally {
        restoreFetch();
        restoreEnv(env);
    }
});
