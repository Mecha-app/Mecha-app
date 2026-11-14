import { Langfuse } from "langfuse";
import type { DiagnosisReport, DiagnosisTier } from "./ai";
import type { DiagnosisLatency, ProviderUsage } from "./provider";

/**
 * Diagnosis tracing (tool stack P1, 2026-11-14) — Langfuse.
 *
 * Every MODEL diagnosis (cache hits excluded — no LLM call happens)
 * leaves one trace: the exact prompt, its version tag
 * (DIAGNOSIS_PROMPT_VERSION in ai.ts), the model that answered, token
 * usage when the backend streamed it back (Langfuse prices the call
 * from model + usage), the measured latency, and the parsed report.
 * That is the eval loop's raw material: a weak answer can be found,
 * priced, and tied to the prompt that produced it
 * (files/OPENROUTER_EVAL_PLAN.md).
 *
 * ENV-GATED, like every wiring in this rebuild: with LANGFUSE_PUBLIC_KEY
 * / LANGFUSE_SECRET_KEY absent, startDiagnosisTrace returns a no-op
 * handle and nothing is constructed or sent. LANGFUSE_BASE_URL (or
 * LANGFUSE_HOST) overrides the default cloud endpoint (self-hosting).
 *
 * Tracing must NEVER break a diagnosis a customer already paid quota
 * for — the same rule as diagnosis persistence in diagnoseService:
 * every call is swallowed-error defensive, and the flush is bounded so
 * a slow trace endpoint cannot hold the response open.
 */

export function isTracingConfigured(
  env: { [key: string]: string | undefined } = process.env,
): boolean {
  return (
    typeof env.LANGFUSE_PUBLIC_KEY === "string" &&
    env.LANGFUSE_PUBLIC_KEY.length > 0 &&
    typeof env.LANGFUSE_SECRET_KEY === "string" &&
    env.LANGFUSE_SECRET_KEY.length > 0
  );
}

let cachedClient: Langfuse | null | undefined;

function getClient(): Langfuse | null {
  if (cachedClient !== undefined) return cachedClient;
  if (!isTracingConfigured()) {
    cachedClient = null;
    return null;
  }
  try {
    cachedClient = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY as string,
      secretKey: process.env.LANGFUSE_SECRET_KEY as string,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? process.env.LANGFUSE_HOST,
    });
  } catch {
    cachedClient = null;
  }
  return cachedClient;
}

const FLUSH_TIMEOUT_MS = 1500;

async function flushBounded(client: Langfuse): Promise<void> {
  try {
    await Promise.race([
      client.flushAsync(),
      new Promise((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS)),
    ]);
  } catch {
    // Tracing is observability, never a diagnosis dependency.
  }
}

export interface DiagnosisTraceInput {
  userId: string;
  tier: DiagnosisTier;
  language?: string;
  promptVersion: string;
  prompt: string;
}

export interface DiagnosisTrace {
  recordSuccess(input: {
    model: string;
    report: DiagnosisReport;
    usage?: ProviderUsage;
    latency: DiagnosisLatency;
  }): Promise<void>;
  recordError(error: unknown): Promise<void>;
}

const NOOP_TRACE: DiagnosisTrace = {
  async recordSuccess() {},
  async recordError() {},
};

/**
 * Start a trace handle for one diagnosis. The Langfuse trace itself is
 * written post-hoc (recordSuccess / recordError) with the generation's
 * start/end reconstructed from the measured latency, so the streaming
 * path carries zero tracing state and zero added latency.
 */
export function startDiagnosisTrace(input: DiagnosisTraceInput): DiagnosisTrace {
  const client = getClient();
  if (!client) return NOOP_TRACE;

  const baseMetadata = {
    tier: input.tier,
    language: input.language ?? "en",
    promptVersion: input.promptVersion,
  };

  return {
    async recordSuccess({ model, report, usage, latency }) {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - Math.max(0, Math.round(latency.totalMs)));
        const trace = client.trace({
          name: "diagnosis",
          userId: input.userId,
          metadata: baseMetadata,
          timestamp: startTime,
        });
        const generation = trace.generation({
          name: "diagnosis-completion",
          model,
          input: input.prompt,
          metadata: {
            ...baseMetadata,
            ttftMs: Math.round(latency.ttftMs),
            totalMs: Math.round(latency.totalMs),
          },
          startTime,
        });
        generation.end({
          output: report,
          // No endTime: the SDK stamps it at end() — which is "now",
          // exactly endTime above; startTime carries the real start.
          ...(usage
            ? {
                usage: {
                  input: usage.inputTokens,
                  output: usage.outputTokens,
                  total: usage.inputTokens + usage.outputTokens,
                  unit: "TOKENS" as const,
                },
              }
            : {}),
        });
        await flushBounded(client);
      } catch {
        // Never surface a tracing failure to the diagnosis path.
      }
    },

    async recordError(error) {
      try {
        const trace = client.trace({
          name: "diagnosis",
          userId: input.userId,
          metadata: { ...baseMetadata, failed: true },
        });
        const generation = trace.generation({
          name: "diagnosis-completion",
          input: input.prompt,
          metadata: baseMetadata,
        });
        generation.end({
          level: "ERROR",
          statusMessage: error instanceof Error ? error.message : "unknown_error",
        });
        await flushBounded(client);
      } catch {
        // Never surface a tracing failure to the diagnosis path.
      }
    },
  };
}
