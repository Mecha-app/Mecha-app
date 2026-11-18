"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StubWarningLightProvider = exports.OpenRouterVisionProvider = exports.OPENROUTER_VISION_MODEL_DEFAULT = exports.AnthropicVisionProvider = exports.VisionProviderError = void 0;
exports.openRouterVisionModel = openRouterVisionModel;
exports.getWarningLightProvider = getWarningLightProvider;
const ai_1 = require("./ai");
const provider_1 = require("./provider");
const scan_1 = require("./scan");
class VisionProviderError extends Error {
    code = "vision_failed";
    constructor(message) {
        super(message);
        this.name = "VisionProviderError";
    }
}
exports.VisionProviderError = VisionProviderError;
/** Vision-capable tier: the same fast model as diagnosis triage. */
const VISION_MODEL = process.env.MECHA_MODEL_VISION ?? "claude-haiku-4-5";
const VISION_TIMEOUT_MS = 30_000;
class AnthropicVisionProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async identify(image) {
        let res;
        try {
            res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: VISION_MODEL,
                    max_tokens: 1200,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: image.mediaType,
                                        data: image.imageBase64,
                                    },
                                },
                                { type: "text", text: (0, scan_1.buildWarningLightPrompt)() },
                            ],
                        },
                    ],
                }),
                signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
            });
        }
        catch {
            throw new VisionProviderError("The photo reader could not be reached.");
        }
        if (!res.ok) {
            throw new VisionProviderError(`The photo reader answered ${res.status}.`);
        }
        const data = (await res.json());
        const text = (data.content ?? [])
            .filter((b) => b.type === "text" && typeof b.text === "string")
            .map((b) => b.text)
            .join("");
        try {
            return (0, scan_1.parseWarningLightResult)(text);
        }
        catch {
            throw new VisionProviderError("The photo reader's answer could not be understood.");
        }
    }
}
exports.AnthropicVisionProvider = AnthropicVisionProvider;
/**
 * Default OpenRouter vision model: the same Haiku tier as the direct
 * Anthropic reader, hosted on OpenRouter. Overridable by environment
 * (MECHA_MODEL_VISION_OPENROUTER) without another code change.
 */
exports.OPENROUTER_VISION_MODEL_DEFAULT = "anthropic/claude-haiku-4.5";
function openRouterVisionModel(env = process.env) {
    return env.MECHA_MODEL_VISION_OPENROUTER ?? exports.OPENROUTER_VISION_MODEL_DEFAULT;
}
class OpenRouterVisionProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async identify(image) {
        let res;
        try {
            res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: openRouterVisionModel(),
                    max_tokens: 1200,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: (0, scan_1.buildWarningLightPrompt)() },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:${image.mediaType};base64,${image.imageBase64}`,
                                    },
                                },
                            ],
                        },
                    ],
                }),
                signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
            });
        }
        catch {
            throw new VisionProviderError("The photo reader could not be reached.");
        }
        if (!res.ok) {
            throw new VisionProviderError(`The photo reader answered ${res.status}.`);
        }
        const data = (await res.json());
        const content = data.choices?.[0]?.message?.content;
        const text = typeof content === "string"
            ? content
            : Array.isArray(content)
                ? content
                    .filter((part) => typeof part.text === "string")
                    .map((part) => part.text)
                    .join("")
                : "";
        try {
            return (0, scan_1.parseWarningLightResult)(text);
        }
        catch {
            throw new VisionProviderError("The photo reader's answer could not be understood.");
        }
    }
}
exports.OpenRouterVisionProvider = OpenRouterVisionProvider;
/**
 * Recording stub — tests assert the route/service invoked the provider
 * exactly once and that identification consumed NO quota. Returns a
 * fixed, clearly-labelled fixture result.
 */
class StubWarningLightProvider {
    result;
    calls = [];
    constructor(result = {
        lights: [
            {
                name: "Check Engine Light",
                meaning: "The engine computer has stored a fault code. The light alone does not name the fault — a scan reads the code underneath it.",
                severity: "Moderate — Fix Soon",
            },
        ],
        odometerMiles: 123_456,
        note: "Stub fixture result.",
    }) {
        this.result = result;
    }
    async identify(image) {
        this.calls.push(image);
        return this.result;
    }
}
exports.StubWarningLightProvider = StubWarningLightProvider;
/** Real provider when the AI layer is wired; null when it is not. */
function getWarningLightProvider() {
    if ((0, provider_1.selectedAiProvider)() === "openrouter") {
        // Same selection contract as the diagnosis engine: the configured
        // check follows the SELECTED provider's key, so an OpenRouter-only
        // environment is wired for vision, and an explicit OpenRouter
        // selection with no key is honestly unwired (never a silent
        // fallback to Anthropic).
        return (0, provider_1.isOpenRouterConfigured)()
            ? new OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY)
            : null;
    }
    if (!(0, ai_1.isAiConfigured)())
        return null;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new ai_1.AiNotConfiguredError();
    return new AnthropicVisionProvider(apiKey);
}
