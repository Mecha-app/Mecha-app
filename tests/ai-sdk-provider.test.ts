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
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AnthropicStreamingProvider,
  OPENROUTER_DEFAULT_TRIAGE_MODEL,
  OpenRouterNotConfiguredError,
  OpenRouterProvider,
  STUB_REPORT_JSON,
  type ProviderEvent,
} from "../lib/server/provider";
import {
  AiSdkOpenRouterProvider,
  getActiveDiagnosisProvider,
  selectedAiEngine,
} from "../lib/server/providerAiSdk";

const ENV_KEYS = ["AI_PROVIDER", "AI_ENGINE", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"] as const;
type EnvKey = (typeof ENV_KEYS)[number];

function snapshotEnv(): Map<EnvKey, string | undefined> {
  return new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Map<EnvKey, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = snapshot.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
const originalFetch = globalThis.fetch;

function setFetch(fn: (url: string, init?: RequestInit) => Promise<Response>): void {
  fetchCalls.length = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string, init?: RequestInit) => {
    fetchCalls.push({ url, init });
    return fn(url, init);
  };
}

function restoreFetch(): void {
  (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
}

function recordedSseFixture(text: string, withUsage = false): string {
  const chunks = [text.slice(0, 17), text.slice(17, 61), text.slice(61)];
  const lines = [": openrouter recorded fixture"];
  for (const chunk of chunks) {
    lines.push(
      `data: ${JSON.stringify({
        id: "gen-recorded-fixture",
        model: OPENROUTER_DEFAULT_TRIAGE_MODEL,
        choices: [{ index: 0, delta: { role: "assistant", content: chunk } }],
      })}`,
    );
  }
  if (withUsage) {
    lines.push(
      `data: ${JSON.stringify({
        id: "gen-recorded-fixture",
        model: OPENROUTER_DEFAULT_TRIAGE_MODEL,
        choices: [],
        usage: { prompt_tokens: 321, completion_tokens: 87 },
      })}`,
    );
  }
  lines.push("data: [DONE]", "");
  return lines.join("\n");
}

function sseResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

async function collect(gen: AsyncGenerator<ProviderEvent>): Promise<ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

function doneOf(events: ProviderEvent[]) {
  const done = events.filter((e) => e.type === "done");
  assert.equal(done.length, 1, "exactly one done event");
  return done[0] as Extract<ProviderEvent, { type: "done" }>;
}

test("engine selection: sdk only when AI_ENGINE=sdk", () => {
  assert.equal(selectedAiEngine({}), "raw");
  assert.equal(selectedAiEngine({ AI_ENGINE: "raw" }), "raw");
  assert.equal(selectedAiEngine({ AI_ENGINE: "sdk" }), "sdk");
  assert.equal(selectedAiEngine({ AI_ENGINE: " SDK " }), "sdk");
});

test("factory: default selection is unchanged (raw providers)", () => {
  const env = snapshotEnv();
  clearEnv();
  try {
    process.env.AI_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "test-key";
    assert.ok(
      getActiveDiagnosisProvider() instanceof OpenRouterProvider,
      "no AI_ENGINE → raw OpenRouter provider",
    );
    delete process.env.AI_PROVIDER;
    delete process.env.OPENROUTER_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
    assert.ok(
      getActiveDiagnosisProvider() instanceof AnthropicStreamingProvider,
      "no AI_PROVIDER → Anthropic default",
    );
  } finally {
    restoreEnv(env);
  }
});

test("factory: AI_ENGINE=sdk selects the SDK provider; unwired → null", () => {
  const env = snapshotEnv();
  clearEnv();
  try {
    process.env.AI_PROVIDER = "openrouter";
    process.env.AI_ENGINE = "sdk";
    assert.equal(getActiveDiagnosisProvider(), null, "sdk selected but no key → null");
    process.env.OPENROUTER_API_KEY = "test-key";
    assert.ok(getActiveDiagnosisProvider() instanceof AiSdkOpenRouterProvider);
  } finally {
    restoreEnv(env);
  }
});

test("SDK provider streams the recorded fixture and parses the shared report", async () => {
  const env = snapshotEnv();
  clearEnv();
  try {
    process.env.OPENROUTER_API_KEY = "test-key";
    setFetch(async () => sseResponse(recordedSseFixture(STUB_REPORT_JSON, true)));
    const provider = new AiSdkOpenRouterProvider(new OpenRouterProvider());
    const events = await collect(
      provider.stream({ problem: "Grinding noise when I brake", vehicleInfo: "2019 Honda Accord" }),
    );
    const deltas = events
      .filter((e) => e.type === "delta")
      .map((e) => (e as Extract<ProviderEvent, { type: "delta" }>).text)
      .join("");
    assert.equal(deltas, STUB_REPORT_JSON, "deltas reconstruct the report JSON");
    const done = doneOf(events);
    assert.equal(done.model, OPENROUTER_DEFAULT_TRIAGE_MODEL);
    assert.equal(done.tier, "triage");
    assert.ok(done.report.diagnosis.includes("worn brake pads"));
    assert.ok(fetchCalls.length >= 1, "the SDK made its HTTP call");
    assert.ok(String(fetchCalls[0].url).includes("openrouter.ai"));
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("SDK provider throws the typed unwired error before any fetch", async () => {
  const env = snapshotEnv();
  clearEnv();
  try {
    setFetch(async () => sseResponse(recordedSseFixture(STUB_REPORT_JSON)));
    const provider = new AiSdkOpenRouterProvider(new OpenRouterProvider());
    await assert.rejects(collect(provider.stream({ problem: "Anything" })), (err: unknown) => {
      assert.ok(err instanceof OpenRouterNotConfiguredError);
      return true;
    });
    assert.equal(fetchCalls.length, 0, "no fetch attempted while unwired");
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("fallback: SDK failure before the first token restarts on the raw provider", async () => {
  const env = snapshotEnv();
  clearEnv();
  try {
    process.env.OPENROUTER_API_KEY = "test-key";
    let call = 0;
    setFetch(async () => {
      call += 1;
      if (call === 1) return new Response("upstream down", { status: 500 });
      return sseResponse(recordedSseFixture(STUB_REPORT_JSON));
    });
    const provider = new AiSdkOpenRouterProvider(new OpenRouterProvider());
    const events = await collect(provider.stream({ problem: "Grinding noise when I brake" }));
    const done = doneOf(events);
    assert.equal(done.model, OPENROUTER_DEFAULT_TRIAGE_MODEL);
    assert.equal(fetchCalls.length, 2, "SDK attempt + raw fallback attempt");
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("no masking: a failure after tokens streamed surfaces, no fallback restart", async () => {
  const env = snapshotEnv();
  clearEnv();
  try {
    process.env.OPENROUTER_API_KEY = "test-key";
    const firstChunk = `data: ${JSON.stringify({
      id: "gen-partial",
      model: OPENROUTER_DEFAULT_TRIAGE_MODEL,
      choices: [{ index: 0, delta: { role: "assistant", content: STUB_REPORT_JSON.slice(0, 17) } }],
    })}\n\n`;
    setFetch(async () => {
      // Pull-based: the first chunk is actually delivered to (and read
      // by) the consumer before the failure — an error enqueued in the
      // same tick as the chunk races ahead of it and no delta would
      // ever surface, which is the pre-token case, not this one.
      let sent = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!sent) {
            sent = true;
            controller.enqueue(new TextEncoder().encode(firstChunk));
            return;
          }
          return new Promise((resolve) =>
            setTimeout(() => {
              controller.error(new Error("stream_broke"));
              resolve();
            }, 50),
          );
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    });
    const provider = new AiSdkOpenRouterProvider(new OpenRouterProvider());
    await assert.rejects(collect(provider.stream({ problem: "Grinding noise" })));
    assert.equal(fetchCalls.length, 1, "no fallback fetch after tokens streamed");
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});
