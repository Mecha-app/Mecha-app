import {
  AI_TIERS,
  AiNotConfiguredError,
  buildDiagnosisPrompt,
  isAiConfigured,
  parseReport,
  type DiagnosisReport,
  type DiagnosisRequest,
  type DiagnosisTier,
} from "./ai";

/**
 * Diagnosis provider (WP5) — the streaming engine behind /api/diagnose.
 *
 * SPEED IS AN OWNER'S ACCEPTANCE RULE: the old app's diagnosis felt
 * broken-slow because its backend was a sleeping free-tier host. This
 * design makes that class of failure impossible — serverless route, no
 * cold process to wake, and the provider call STREAMS: the response is
 * an async generator of text deltas so the client sees the first words
 * in roughly the time-to-first-token, not after the full completion.
 * Anthropic is the default backend; OpenRouter is the owner-approved
 * alternative selected explicitly with AI_PROVIDER=openrouter.
 * Latency (time-to-first-token + total) is measured on every call and
 * written to the server log as structured JSON.
 *
 * The provider is an interface so tests run against a recording stub —
 * the suite proves a quota-blocked user NEVER reaches the provider.
 */

export interface DiagnosisLatency {
  ttftMs: number;
  totalMs: number;
}

export type ProviderEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      report: DiagnosisReport;
      model: string;
      tier: DiagnosisTier;
      latency: DiagnosisLatency;
    };

export interface DiagnosisProvider {
  readonly name: string;
  stream(req: DiagnosisRequest): AsyncGenerator<ProviderEvent>;
}

/** Which hosted inference backend serves diagnosis requests. */
export type AiProviderName = "anthropic" | "openrouter";

/**
 * The provider selected by the environment. Anthropic remains the
 * default so an unset AI_PROVIDER preserves the historical behavior
 * byte-for-byte; OpenRouter is selected only by the owner's explicit
 * AI_PROVIDER=openrouter wiring.
 */
export function selectedAiProvider(
  env: { [key: string]: string | undefined } = process.env,
): AiProviderName {
  return env.AI_PROVIDER?.trim().toLowerCase() === "openrouter" ? "openrouter" : "anthropic";
}

export function isOpenRouterConfigured(
  env: { [key: string]: string | undefined } = process.env,
): boolean {
  return typeof env.OPENROUTER_API_KEY === "string" && env.OPENROUTER_API_KEY.length > 0;
}

/**
 * OpenRouter counterpart to AiNotConfiguredError. It deliberately
 * carries the same `ai_not_configured` code: the route checks for the
 * unwired state before executeDiagnosis, so a missing OpenRouter key
 * can never consume a customer's diagnosis quota.
 */
export class OpenRouterNotConfiguredError extends AiNotConfiguredError {
  constructor() {
    super();
    this.name = "OpenRouterNotConfiguredError";
    this.message =
      "OPENROUTER_API_KEY is not set — the diagnosis engine is not wired in this environment.";
  }
}

const NL = String.fromCharCode(10);

function logLatency(model: string, tier: DiagnosisTier, latency: DiagnosisLatency): void {
  console.info(
    JSON.stringify({
      event: "diagnosis_latency",
      model,
      tier,
      ttftMs: Math.round(latency.ttftMs),
      totalMs: Math.round(latency.totalMs),
    }),
  );
}

// ---------------------------------------------------------------------------
// Anthropic streaming provider
// ---------------------------------------------------------------------------

interface AnthropicStreamEvent {
  type?: string;
  delta?: { type?: string; text?: string };
}

export class AnthropicStreamingProvider implements DiagnosisProvider {
  readonly name = "anthropic";

  async *stream(req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    if (!isAiConfigured()) throw new AiNotConfiguredError();
    const tier: DiagnosisTier = req.tier === "deep" ? "deep" : "triage";
    const config = AI_TIERS[tier];
    const started = performance.now();
    let firstTokenAt: number | null = null;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        stream: true,
        messages: [{ role: "user", content: buildDiagnosisPrompt(req) }],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`anthropic_http_${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    const handleLine = function* (line: string): Generator<ProviderEvent> {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const data = trimmed.slice("data:".length).trim();
      if (data.length === 0 || data === "[DONE]") return;
      let event: AnthropicStreamEvent;
      try {
        event = JSON.parse(data) as AnthropicStreamEvent;
      } catch {
        return;
      }
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        typeof event.delta.text === "string"
      ) {
        if (firstTokenAt === null) firstTokenAt = performance.now();
        fullText += event.delta.text;
        // TypeScript cannot see the closure assignment above; re-check.
        yield { type: "delta", text: event.delta.text };
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(NL);
      buffer = lines.pop() ?? "";
      for (const line of lines) yield* handleLine(line);
    }
    if (buffer.length > 0) yield* handleLine(buffer);

    const totalMs = performance.now() - started;
    const latency: DiagnosisLatency = {
      ttftMs: (firstTokenAt ?? started + totalMs) - started,
      totalMs,
    };
    logLatency(config.model, tier, latency);

    const match = fullText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("diagnosis_parse_failed");
    const report = parseReport(match[0]);
    yield { type: "done", report, model: config.model, tier, latency };
  }
}

// ---------------------------------------------------------------------------
// OpenRouter streaming provider
// ---------------------------------------------------------------------------

/**
 * Default OpenRouter models. These are named constants on purpose:
 * the triage default is a strong, inexpensive open chat model, while
 * deep keeps a Sonnet-class quality ceiling. Either can be overridden
 * by environment for the A/B evaluation without another code change.
 */
export const OPENROUTER_DEFAULT_TRIAGE_MODEL = "deepseek/deepseek-chat";
export const OPENROUTER_DEFAULT_DEEP_MODEL = "anthropic/claude-sonnet-4.5";

export function openRouterModelForTier(
  tier: DiagnosisTier,
  env: { [key: string]: string | undefined } = process.env,
): string {
  return tier === "deep"
    ? env.OPENROUTER_MODEL_DEEP ?? OPENROUTER_DEFAULT_DEEP_MODEL
    : env.OPENROUTER_MODEL_TRIAGE ?? OPENROUTER_DEFAULT_TRIAGE_MODEL;
}

interface OpenRouterStreamEvent {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ type?: string; text?: string }> | null;
    };
  }>;
}

function openRouterDeltaText(event: OpenRouterStreamEvent): string {
  const content = event.choices?.[0]?.delta?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part.text === "string")
      .map((part) => part.text as string)
      .join("");
  }
  return "";
}

export class OpenRouterProvider implements DiagnosisProvider {
  readonly name = "openrouter";

  async *stream(req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    if (!isOpenRouterConfigured()) throw new OpenRouterNotConfiguredError();
    const tier: DiagnosisTier = req.tier === "deep" ? "deep" : "triage";
    const config = AI_TIERS[tier];
    const model = openRouterModelForTier(tier);
    const started = performance.now();
    let firstTokenAt: number | null = null;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY as string}`,
      },
      body: JSON.stringify({
        model,
        // Keep token ceilings in lockstep with the Anthropic tiers.
        max_tokens: config.maxTokens,
        stream: true,
        messages: [{ role: "user", content: buildDiagnosisPrompt(req) }],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`openrouter_http_${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    const handleLine = function* (line: string): Generator<ProviderEvent> {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const data = trimmed.slice("data:".length).trim();
      if (data.length === 0 || data === "[DONE]") return;
      let event: OpenRouterStreamEvent;
      try {
        event = JSON.parse(data) as OpenRouterStreamEvent;
      } catch {
        return;
      }
      const text = openRouterDeltaText(event);
      if (text.length > 0) {
        if (firstTokenAt === null) firstTokenAt = performance.now();
        fullText += text;
        yield { type: "delta", text };
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(NL);
      buffer = lines.pop() ?? "";
      for (const line of lines) yield* handleLine(line);
    }
    if (buffer.length > 0) yield* handleLine(buffer);

    const totalMs = performance.now() - started;
    const latency: DiagnosisLatency = {
      ttftMs: (firstTokenAt ?? started + totalMs) - started,
      totalMs,
    };
    logLatency(model, tier, latency);

    const match = fullText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("diagnosis_parse_failed");
    const report = parseReport(match[0]);
    yield { type: "done", report, model, tier, latency };
  }
}

// ---------------------------------------------------------------------------
// Recording stub — tests only. Never calls the real API. Yields a canned
// repo-shaped report JSON in small chunks and remembers every invocation
// so tests can assert the provider was (or was NOT) reached.
// ---------------------------------------------------------------------------

export const STUB_REPORT_JSON = JSON.stringify({
  severity: "Moderate — Fix Soon",
  safeToDriver: true,
  diagnosis:
    "The grinding noise and soft pedal point to worn brake pads. The car is safe to drive carefully to a shop, but the pads should be replaced within days.",
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

export class StubDiagnosisProvider implements DiagnosisProvider {
  readonly name = "stub";
  readonly calls: DiagnosisRequest[] = [];
  private readonly chunkSize: number;
  private readonly delayMs: number;

  constructor(options: { chunkSize?: number; delayMs?: number } = {}) {
    this.chunkSize = options.chunkSize ?? 24;
    this.delayMs = options.delayMs ?? 0;
  }

  async *stream(req: DiagnosisRequest): AsyncGenerator<ProviderEvent> {
    this.calls.push(req);
    const started = performance.now();
    let firstTokenAt: number | null = null;
    for (let i = 0; i < STUB_REPORT_JSON.length; i += this.chunkSize) {
      if (this.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
      if (firstTokenAt === null) firstTokenAt = performance.now();
      yield { type: "delta", text: STUB_REPORT_JSON.slice(i, i + this.chunkSize) };
    }
    const totalMs = performance.now() - started;
    const latency: DiagnosisLatency = {
      ttftMs: (firstTokenAt ?? started) - started,
      totalMs,
    };
    const report = parseReport(STUB_REPORT_JSON);
    yield {
      type: "done",
      report,
      model: "stub-model",
      tier: req.tier === "deep" ? "deep" : "triage",
      latency,
    };
  }
}

// ---------------------------------------------------------------------------

/** The production provider, or null when no key is wired (honest 501). */
export function getDiagnosisProvider(): DiagnosisProvider | null {
  if (selectedAiProvider() === "openrouter") {
    // Explicit selection never falls back silently to Anthropic: if
    // OpenRouter is chosen but unwired, the route reports the engine
    // as not configured before any quota can be consumed.
    return isOpenRouterConfigured() ? new OpenRouterProvider() : null;
  }
  return isAiConfigured() ? new AnthropicStreamingProvider() : null;
}
