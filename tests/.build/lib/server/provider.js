"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StubDiagnosisProvider = exports.STUB_REPORT_JSON = exports.OpenRouterProvider = exports.OPENROUTER_DEFAULT_DEEP_MODEL = exports.OPENROUTER_DEFAULT_TRIAGE_MODEL = exports.AnthropicStreamingProvider = exports.OpenRouterNotConfiguredError = void 0;
exports.selectedAiProvider = selectedAiProvider;
exports.isOpenRouterConfigured = isOpenRouterConfigured;
exports.logLatency = logLatency;
exports.openRouterModelForTier = openRouterModelForTier;
exports.getDiagnosisProvider = getDiagnosisProvider;
const ai_1 = require("./ai");
/**
 * The provider selected by the environment. Anthropic remains the
 * default so an unset AI_PROVIDER preserves the historical behavior
 * byte-for-byte; OpenRouter is selected only by the owner's explicit
 * AI_PROVIDER=openrouter wiring.
 */
function selectedAiProvider(env = process.env) {
    return env.AI_PROVIDER?.trim().toLowerCase() === "openrouter" ? "openrouter" : "anthropic";
}
function isOpenRouterConfigured(env = process.env) {
    return typeof env.OPENROUTER_API_KEY === "string" && env.OPENROUTER_API_KEY.length > 0;
}
/**
 * OpenRouter counterpart to AiNotConfiguredError. It deliberately
 * carries the same `ai_not_configured` code: the route checks for the
 * unwired state before executeDiagnosis, so a missing OpenRouter key
 * can never consume a customer's diagnosis quota.
 */
class OpenRouterNotConfiguredError extends ai_1.AiNotConfiguredError {
    constructor() {
        super();
        this.name = "OpenRouterNotConfiguredError";
        this.message =
            "OPENROUTER_API_KEY is not set — the diagnosis engine is not wired in this environment.";
    }
}
exports.OpenRouterNotConfiguredError = OpenRouterNotConfiguredError;
const NL = String.fromCharCode(10);
function logLatency(model, tier, latency) {
    console.info(JSON.stringify({
        event: "diagnosis_latency",
        model,
        tier,
        ttftMs: Math.round(latency.ttftMs),
        totalMs: Math.round(latency.totalMs),
    }));
}
class AnthropicStreamingProvider {
    name = "anthropic";
    async *stream(req) {
        if (!(0, ai_1.isAiConfigured)())
            throw new ai_1.AiNotConfiguredError();
        const tier = req.tier === "deep" ? "deep" : "triage";
        const config = ai_1.AI_TIERS[tier];
        const started = performance.now();
        let firstTokenAt = null;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: config.maxTokens,
                stream: true,
                messages: [{ role: "user", content: (0, ai_1.buildDiagnosisPrompt)(req) }],
            }),
        });
        if (!res.ok || !res.body) {
            throw new Error(`anthropic_http_${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let usageInput = 0;
        let usageOutput = 0;
        const handleLine = function* (line) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:"))
                return;
            const data = trimmed.slice("data:".length).trim();
            if (data.length === 0 || data === "[DONE]")
                return;
            let event;
            try {
                event = JSON.parse(data);
            }
            catch {
                return;
            }
            if (event.type === "message_start" && typeof event.message?.usage?.input_tokens === "number") {
                usageInput = event.message.usage.input_tokens;
            }
            if (event.type === "message_delta" && typeof event.usage?.output_tokens === "number") {
                usageOutput = event.usage.output_tokens;
            }
            if (event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                typeof event.delta.text === "string") {
                if (firstTokenAt === null)
                    firstTokenAt = performance.now();
                fullText += event.delta.text;
                // TypeScript cannot see the closure assignment above; re-check.
                yield { type: "delta", text: event.delta.text };
            }
        };
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(NL);
            buffer = lines.pop() ?? "";
            for (const line of lines)
                yield* handleLine(line);
        }
        if (buffer.length > 0)
            yield* handleLine(buffer);
        const totalMs = performance.now() - started;
        const latency = {
            ttftMs: (firstTokenAt ?? started + totalMs) - started,
            totalMs,
        };
        logLatency(config.model, tier, latency);
        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match)
            throw new Error("diagnosis_parse_failed");
        const report = (0, ai_1.parseReport)(match[0]);
        yield {
            type: "done",
            report,
            model: config.model,
            tier,
            latency,
            ...(usageInput + usageOutput > 0
                ? { usage: { inputTokens: usageInput, outputTokens: usageOutput } }
                : {}),
        };
    }
}
exports.AnthropicStreamingProvider = AnthropicStreamingProvider;
// ---------------------------------------------------------------------------
// OpenRouter streaming provider
// ---------------------------------------------------------------------------
/**
 * Default OpenRouter models. These are named constants on purpose:
 * the triage default is a strong, inexpensive open chat model, while
 * deep keeps a Sonnet-class quality ceiling. Either can be overridden
 * by environment for the A/B evaluation without another code change.
 */
exports.OPENROUTER_DEFAULT_TRIAGE_MODEL = "deepseek/deepseek-chat";
exports.OPENROUTER_DEFAULT_DEEP_MODEL = "anthropic/claude-sonnet-4.5";
function openRouterModelForTier(tier, env = process.env) {
    return tier === "deep"
        ? env.OPENROUTER_MODEL_DEEP ?? exports.OPENROUTER_DEFAULT_DEEP_MODEL
        : env.OPENROUTER_MODEL_TRIAGE ?? exports.OPENROUTER_DEFAULT_TRIAGE_MODEL;
}
function openRouterDeltaText(event) {
    const content = event.choices?.[0]?.delta?.content;
    if (typeof content === "string")
        return content;
    if (Array.isArray(content)) {
        return content
            .filter((part) => typeof part.text === "string")
            .map((part) => part.text)
            .join("");
    }
    return "";
}
class OpenRouterProvider {
    name = "openrouter";
    async *stream(req) {
        if (!isOpenRouterConfigured())
            throw new OpenRouterNotConfiguredError();
        const tier = req.tier === "deep" ? "deep" : "triage";
        const config = ai_1.AI_TIERS[tier];
        const model = openRouterModelForTier(tier);
        const started = performance.now();
        let firstTokenAt = null;
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
                model,
                // Keep token ceilings in lockstep with the Anthropic tiers.
                max_tokens: config.maxTokens,
                stream: true,
                // Ask OpenRouter to stream token usage back on the final chunk
                // (its documented extension) so cost tracing gets real numbers.
                usage: { include: true },
                messages: [{ role: "user", content: (0, ai_1.buildDiagnosisPrompt)(req) }],
            }),
        });
        if (!res.ok || !res.body) {
            throw new Error(`openrouter_http_${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let usage;
        const handleLine = function* (line) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:"))
                return;
            const data = trimmed.slice("data:".length).trim();
            if (data.length === 0 || data === "[DONE]")
                return;
            let event;
            try {
                event = JSON.parse(data);
            }
            catch {
                return;
            }
            if (typeof event.usage?.prompt_tokens === "number" ||
                typeof event.usage?.completion_tokens === "number") {
                usage = {
                    inputTokens: event.usage.prompt_tokens ?? 0,
                    outputTokens: event.usage.completion_tokens ?? 0,
                };
            }
            const text = openRouterDeltaText(event);
            if (text.length > 0) {
                if (firstTokenAt === null)
                    firstTokenAt = performance.now();
                fullText += text;
                yield { type: "delta", text };
            }
        };
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(NL);
            buffer = lines.pop() ?? "";
            for (const line of lines)
                yield* handleLine(line);
        }
        if (buffer.length > 0)
            yield* handleLine(buffer);
        const totalMs = performance.now() - started;
        const latency = {
            ttftMs: (firstTokenAt ?? started + totalMs) - started,
            totalMs,
        };
        logLatency(model, tier, latency);
        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match)
            throw new Error("diagnosis_parse_failed");
        const report = (0, ai_1.parseReport)(match[0]);
        yield { type: "done", report, model, tier, latency, ...(usage ? { usage } : {}) };
    }
}
exports.OpenRouterProvider = OpenRouterProvider;
// ---------------------------------------------------------------------------
// Recording stub — tests only. Never calls the real API. Yields a canned
// repo-shaped report JSON in small chunks and remembers every invocation
// so tests can assert the provider was (or was NOT) reached.
// ---------------------------------------------------------------------------
exports.STUB_REPORT_JSON = JSON.stringify({
    severity: "Moderate — Fix Soon",
    safeToDriver: true,
    diagnosis: "The grinding noise and soft pedal point to worn brake pads. The car is safe to drive carefully to a shop, but the pads should be replaced within days.",
    estimatedCost: { min: 180, max: 340 },
    laborHours: { min: 1, max: 1.5 },
    parts: [
        {
            name: "Brake pads (front set)",
            estimatedCost: "$60-120",
            likelihood: "likely",
            description: "Worn pads are the most common cause of this noise.",
        },
    ],
    steps: ["Book a brake inspection this week.", "Ask for the pad thickness reading in writing."],
    tip: "Ask the shop to show you the old pads — honest shops expect the question.",
});
class StubDiagnosisProvider {
    name = "stub";
    calls = [];
    chunkSize;
    delayMs;
    constructor(options = {}) {
        this.chunkSize = options.chunkSize ?? 24;
        this.delayMs = options.delayMs ?? 0;
    }
    async *stream(req) {
        this.calls.push(req);
        const started = performance.now();
        let firstTokenAt = null;
        for (let i = 0; i < exports.STUB_REPORT_JSON.length; i += this.chunkSize) {
            if (this.delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, this.delayMs));
            }
            if (firstTokenAt === null)
                firstTokenAt = performance.now();
            yield { type: "delta", text: exports.STUB_REPORT_JSON.slice(i, i + this.chunkSize) };
        }
        const totalMs = performance.now() - started;
        const latency = {
            ttftMs: (firstTokenAt ?? started) - started,
            totalMs,
        };
        const report = (0, ai_1.parseReport)(exports.STUB_REPORT_JSON);
        yield {
            type: "done",
            report,
            model: "stub-model",
            tier: req.tier === "deep" ? "deep" : "triage",
            latency,
        };
    }
}
exports.StubDiagnosisProvider = StubDiagnosisProvider;
// ---------------------------------------------------------------------------
/** The production provider, or null when no key is wired (honest 501). */
function getDiagnosisProvider() {
    if (selectedAiProvider() === "openrouter") {
        // Explicit selection never falls back silently to Anthropic: if
        // OpenRouter is chosen but unwired, the route reports the engine
        // as not configured before any quota can be consumed.
        return isOpenRouterConfigured() ? new OpenRouterProvider() : null;
    }
    return (0, ai_1.isAiConfigured)() ? new AnthropicStreamingProvider() : null;
}
