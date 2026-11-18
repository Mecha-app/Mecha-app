"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSdkOpenRouterProvider = void 0;
exports.selectedAiEngine = selectedAiEngine;
exports.getActiveDiagnosisProvider = getActiveDiagnosisProvider;
const ai_1 = require("ai");
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const ai_2 = require("./ai");
const provider_1 = require("./provider");
function selectedAiEngine(env = process.env) {
    return env.AI_ENGINE?.trim().toLowerCase() === "sdk" ? "sdk" : "raw";
}
class AiSdkOpenRouterProvider {
    fallback;
    name = "openrouter-aisdk";
    constructor(fallback) {
        this.fallback = fallback;
    }
    async *stream(req) {
        if (!(0, provider_1.isOpenRouterConfigured)())
            throw new provider_1.OpenRouterNotConfiguredError();
        let yieldedAny = false;
        try {
            for await (const event of this.streamViaSdk(req)) {
                yieldedAny = true;
                yield event;
            }
        }
        catch (err) {
            if (yieldedAny)
                throw err;
            // Nothing reached the customer yet — restart on the raw provider.
            yield* this.fallback.stream(req);
        }
    }
    async *streamViaSdk(req) {
        const tier = req.tier === "deep" ? "deep" : "triage";
        const config = ai_2.AI_TIERS[tier];
        const model = (0, provider_1.openRouterModelForTier)(tier);
        const started = performance.now();
        let firstTokenAt = null;
        let fullText = "";
        const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({
            apiKey: process.env.OPENROUTER_API_KEY,
        });
        const result = (0, ai_1.streamText)({
            model: openrouter.chat(model),
            // Keep token ceilings in lockstep with the Anthropic tiers.
            maxOutputTokens: config.maxTokens,
            // No SDK-internal retries: recovery is owned by ONE explicit
            // path — the raw-provider fallback in stream() above. Hidden
            // retries would double the recovery and slow every real failure.
            maxRetries: 0,
            messages: [{ role: "user", content: (0, ai_2.buildDiagnosisPrompt)(req) }],
        });
        for await (const text of result.textStream) {
            if (text.length === 0)
                continue;
            if (firstTokenAt === null)
                firstTokenAt = performance.now();
            fullText += text;
            yield { type: "delta", text };
        }
        const totalMs = performance.now() - started;
        const latency = {
            ttftMs: (firstTokenAt ?? started + totalMs) - started,
            totalMs,
        };
        (0, provider_1.logLatency)(model, tier, latency);
        const match = fullText.match(/\{[\s\S]*\}/);
        if (!match)
            throw new Error("diagnosis_parse_failed");
        const report = (0, ai_2.parseReport)(match[0]);
        let usage;
        try {
            const sdkUsage = await result.usage;
            if (sdkUsage &&
                (typeof sdkUsage.inputTokens === "number" || typeof sdkUsage.outputTokens === "number")) {
                usage = {
                    inputTokens: sdkUsage.inputTokens ?? 0,
                    outputTokens: sdkUsage.outputTokens ?? 0,
                };
            }
        }
        catch {
            // Usage is a tracing nicety, never a diagnosis dependency.
        }
        yield { type: "done", report, model, tier, latency, ...(usage ? { usage } : {}) };
    }
}
exports.AiSdkOpenRouterProvider = AiSdkOpenRouterProvider;
/**
 * The provider the diagnose route uses: the AI SDK engine when the env
 * opts into it (AI_PROVIDER=openrouter + AI_ENGINE=sdk), otherwise the
 * historical selection from provider.ts, untouched.
 */
function getActiveDiagnosisProvider() {
    if ((0, provider_1.selectedAiProvider)() === "openrouter" && selectedAiEngine() === "sdk") {
        // Same unwired discipline as the raw path: explicit selection with
        // no key returns null so the route reports ai_not_configured
        // BEFORE any quota can be consumed.
        return (0, provider_1.isOpenRouterConfigured)()
            ? new AiSdkOpenRouterProvider(new provider_1.OpenRouterProvider())
            : null;
    }
    return (0, provider_1.getDiagnosisProvider)();
}
