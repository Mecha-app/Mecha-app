import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  AI_TIERS,
  buildDiagnosisPrompt,
  parseReport,
  type DiagnosisRequest,
  type DiagnosisTier,
} from "./ai";
import {
  OpenRouterNotConfiguredError,
  OpenRouterProvider,
  getDiagnosisProvider,
  isOpenRouterConfigured,
  logLatency,
  openRouterModelForTier,
  selectedAiProvider,
  type DiagnosisLatency,
  type DiagnosisProvider,
  type ProviderEvent,
  type ProviderUsage,
} from "./provider";

/**
 * Vercel AI SDK diagnosis engine (tool stack P1, 2026-11-14).
 *
 * The diagnosis flow can run on the Vercel AI SDK instead of the raw
 * fetch providers in provider.ts: standardized streaming, provider
 * switching behind one interface, and tool calling becomes available
 * to the diagnosis route without another rewrite. The SDK path speaks
 * to OpenRouter through its official provider package
 * (@openrouter/ai-sdk-provider), matching the owner's OpenRouter pivot
 * — one key, many models, the same model ids and token ceilings as the
 * raw OpenRouter provider.
 *
 * SELECTION (env): AI_ENGINE=sdk opts in, and only alongside
 * AI_PROVIDER=openrouter. Every other configuration resolves through
 * provider.ts's getDiagnosisProvider() UNCHANGED — the historical
 * behavior (Anthropic default, raw OpenRouter) is preserved byte-for-
 * byte, including the test-suite's pinned selection semantics.
 *
 * FALLBACK: if the SDK path fails before the first token reaches the
 * customer, the stream restarts on the raw OpenRouterProvider — the
 * exact code path production runs today. A failure after tokens have
 * streamed is never masked by a restart (the customer already saw a
 * partial answer; the error surfaces honestly instead).
 */

export type AiEngineName = "raw" | "sdk";

export function selectedAiEngine(
  env: { [key: string]: string | undefined } = process.env,
): AiEngineName {
  return env.AI_ENGINE?.trim().toLowerCase() === "sdk" ? "sdk" : "raw";
}

export class AiSdkOpenRouterProvider implements DiagnosisProvider {
  readonly name = "openrouter-aisdk";

  constructor(private readonly fallback: DiagnosisProvider) {}

  async *stream(req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    if (!isOpenRouterConfigured()) throw new OpenRouterNotConfiguredError();
    let yieldedAny = false;
    try {
      for await (const event of this.streamViaSdk(req)) {
        yieldedAny = true;
        yield event;
      }
    } catch (err) {
      if (yieldedAny) throw err;
      // Nothing reached the customer yet — restart on the raw provider.
      yield* this.fallback.stream(req);
    }
  }

  private async *streamViaSdk(req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    const tier: DiagnosisTier = req.tier === "deep" ? "deep" : "triage";
    const config = AI_TIERS[tier];
    const model = openRouterModelForTier(tier);
    const started = performance.now();
    let firstTokenAt: number | null = null;
    let fullText = "";

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY as string,
    });
    const result = streamText({
      model: openrouter.chat(model),
      // Keep token ceilings in lockstep with the Anthropic tiers.
      maxOutputTokens: config.maxTokens,
      // No SDK-internal retries: recovery is owned by ONE explicit
      // path — the raw-provider fallback in stream() above. Hidden
      // retries would double the recovery and slow every real failure.
      maxRetries: 0,
      messages: [{ role: "user", content: buildDiagnosisPrompt(req) }],
    });

    for await (const text of result.textStream) {
      if (text.length === 0) continue;
      if (firstTokenAt === null) firstTokenAt = performance.now();
      fullText += text;
      yield { type: "delta", text };
    }

    const totalMs = performance.now() - started;
    const latency: DiagnosisLatency = {
      ttftMs: (firstTokenAt ?? started + totalMs) - started,
      totalMs,
    };
    logLatency(model, tier, latency);

    const match = fullText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("diagnosis_parse_failed");
    const report = parseReport(match[0]);

    let usage: ProviderUsage | undefined;
    try {
      const sdkUsage = await result.usage;
      if (
        sdkUsage &&
        (typeof sdkUsage.inputTokens === "number" || typeof sdkUsage.outputTokens === "number")
      ) {
        usage = {
          inputTokens: sdkUsage.inputTokens ?? 0,
          outputTokens: sdkUsage.outputTokens ?? 0,
        };
      }
    } catch {
      // Usage is a tracing nicety, never a diagnosis dependency.
    }

    yield { type: "done", report, model, tier, latency, ...(usage ? { usage } : {}) };
  }
}

/**
 * The provider the diagnose route uses: the AI SDK engine when the env
 * opts into it (AI_PROVIDER=openrouter + AI_ENGINE=sdk), otherwise the
 * historical selection from provider.ts, untouched.
 */
export function getActiveDiagnosisProvider(): DiagnosisProvider | null {
  if (selectedAiProvider() === "openrouter" && selectedAiEngine() === "sdk") {
    // Same unwired discipline as the raw path: explicit selection with
    // no key returns null so the route reports ai_not_configured
    // BEFORE any quota can be consumed.
    return isOpenRouterConfigured()
      ? new AiSdkOpenRouterProvider(new OpenRouterProvider())
      : null;
  }
  return getDiagnosisProvider();
}
