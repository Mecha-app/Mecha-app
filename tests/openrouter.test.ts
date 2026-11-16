/**
 * OpenRouter provider tests.
 *
 * The network is replaced with a recorded OpenAI-compatible SSE
 * fixture: no real OpenRouter account, key, or paid call is involved.
 * These tests pin the provider contract shared with Anthropic —
 * streamed deltas, the same prompt/parser behavior, typed unwired
 * handling before fetch, max-token parity, and env-only selection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPartsBlock, PARTS_DISCLOSURE } from "../lib/server/parts";
import {
  AnthropicStreamingProvider,
  OPENROUTER_DEFAULT_DEEP_MODEL,
  OPENROUTER_DEFAULT_TRIAGE_MODEL,
  OpenRouterNotConfiguredError,
  OpenRouterProvider,
  STUB_REPORT_JSON,
  getDiagnosisProvider,
  type ProviderEvent,
} from "../lib/server/provider";

const ENV_KEYS = [
  "AI_PROVIDER",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL_TRIAGE",
  "OPENROUTER_MODEL_DEEP",
] as const;

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

function clearProviderEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const fetchCalls: FetchCall[] = [];
const originalFetch = globalThis.fetch;

function installFetchFixture(body: string): void {
  fetchCalls.length = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async (
    url: string,
    init?: RequestInit,
  ) => {
    fetchCalls.push({ url, init });
    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
}

function restoreFetch(): void {
  (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
}

function recordedSseFixture(text: string): string {
  // Split the report unevenly, as a real token stream would, while
  // retaining an exact recorded-chat-completions SSE shape.
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
  lines.push("data: [DONE]", "");
  return lines.join("\n");
}

async function collect(gen: AsyncGenerator<ProviderEvent>): Promise<ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

test("OpenRouter streams recorded SSE deltas and parses the shared report", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  installFetchFixture(recordedSseFixture(STUB_REPORT_JSON));

  try {
    const provider = new OpenRouterProvider();
    const events = await collect(
      provider.stream({
        problem: "Grinding noise when I brake",
        vehicleInfo: "2019 Honda Accord",
        language: "en",
      }),
    );

    const deltas = events.filter((event) => event.type === "delta");
    assert.equal(
      deltas.map((event) => (event.type === "delta" ? event.text : "")).join(""),
      STUB_REPORT_JSON,
      "delta events must reconstruct the model text exactly",
    );

    const done = events.find((event) => event.type === "done");
    assert.ok(done && done.type === "done");
    assert.equal(done.model, OPENROUTER_DEFAULT_TRIAGE_MODEL);
    assert.equal(done.model, "deepseek/deepseek-chat");
    assert.equal(done.tier, "triage");
    assert.equal(done.report.severity, "Moderate — Fix Soon");
    assert.equal(done.report.safeToDriver, true);
    assert.ok(done.report.diagnosis.includes("worn brake pads"));
    assert.equal(done.report.parts[0].name, "Brake pads (front set)");
    assert.ok(done.latency.totalMs >= done.latency.ttftMs);

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(fetchCalls[0].init?.method, "POST");
    const headers = fetchCalls[0].init?.headers as Record<string, string>;
    assert.equal(headers.authorization, `Bearer ${process.env.OPENROUTER_API_KEY}`);
    assert.equal(headers["content-type"], "application/json");

    const body = JSON.parse(String(fetchCalls[0].init?.body)) as {
      model: string;
      max_tokens: number;
      stream: boolean;
      messages: Array<{ role: string; content: string }>;
    };
    assert.equal(body.model, OPENROUTER_DEFAULT_TRIAGE_MODEL);
    assert.equal(body.max_tokens, 1500, "triage keeps Anthropic token parity");
    assert.equal(body.stream, true);
    assert.equal(body.messages.length, 1);
    assert.equal(body.messages[0].role, "user");
    assert.ok(body.messages[0].content.includes("Vehicle: 2019 Honda Accord"));
    assert.ok(body.messages[0].content.includes("Problem: Grinding noise when I brake"));
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("OpenRouter deep tier honors its model override and token parity", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  process.env.OPENROUTER_MODEL_DEEP = "example/deep-eval-model";
  installFetchFixture(recordedSseFixture(STUB_REPORT_JSON));

  try {
    const events = await collect(
      new OpenRouterProvider().stream({ problem: "Deep check", tier: "deep" }),
    );
    const done = events.find((event) => event.type === "done");
    assert.ok(done && done.type === "done");
    assert.equal(done.model, "example/deep-eval-model");
    assert.equal(done.tier, "deep");
    assert.equal(OPENROUTER_DEFAULT_DEEP_MODEL, "anthropic/claude-sonnet-4.5");

    const body = JSON.parse(String(fetchCalls[0].init?.body)) as {
      model: string;
      max_tokens: number;
    };
    assert.equal(body.model, "example/deep-eval-model");
    assert.equal(body.max_tokens, 4000, "deep keeps Anthropic token parity");
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("OpenRouter missing key throws the typed error before any fetch", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  installFetchFixture(recordedSseFixture(STUB_REPORT_JSON));

  try {
    await assert.rejects(
      collect(new OpenRouterProvider().stream({ problem: "Will not run" })),
      (err: unknown) => {
        assert.ok(err instanceof OpenRouterNotConfiguredError);
        assert.equal(err.code, "ai_not_configured");
        assert.ok(err.message.includes("OPENROUTER_API_KEY is not set"));
        return true;
      },
    );
    assert.equal(fetchCalls.length, 0, "an unwired provider must never call the network");
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("provider selection defaults to Anthropic and switches only on AI_PROVIDER", () => {
  const env = snapshotEnv();
  clearProviderEnv();

  try {
    assert.equal(getDiagnosisProvider(), null, "no configured provider returns null");

    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    const fallback = getDiagnosisProvider();
    assert.ok(fallback instanceof AnthropicStreamingProvider);
    assert.equal(fallback.name, "anthropic");

    process.env.AI_PROVIDER = "openrouter";
    assert.equal(
      getDiagnosisProvider(),
      null,
      "explicit OpenRouter selection must not silently fall back when its key is absent",
    );

    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    const selected = getDiagnosisProvider();
    assert.ok(selected instanceof OpenRouterProvider);
    assert.equal(selected.name, "openrouter");

    process.env.AI_PROVIDER = " OPENROUTER ";
    assert.ok(getDiagnosisProvider() instanceof OpenRouterProvider);

    delete process.env.AI_PROVIDER;
    assert.ok(
      getDiagnosisProvider() instanceof AnthropicStreamingProvider,
      "unsetting AI_PROVIDER restores the historical Anthropic default",
    );
  } finally {
    restoreEnv(env);
  }
});

test("OpenRouter output feeds parts unchanged; provider and downstream layers stay decoupled", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  installFetchFixture(recordedSseFixture(STUB_REPORT_JSON));

  try {
    const events = await collect(
      new OpenRouterProvider().stream({
        problem: "Grinding noise when I brake",
        vehicleInfo: "2019 Honda Accord",
      }),
    );
    const done = events.find((event) => event.type === "done");
    assert.ok(done && done.type === "done");

    const block = buildPartsBlock({
      diagnosis: done.report,
      vehicle: { vehicleInfo: "2019 Honda Accord" },
    });
    assert.equal(block.disclosure, PARTS_DISCLOSURE);
    assert.equal(block.discountNote, null);
    assert.equal(block.parts[0].name, "Brake pads (front set)");
    assert.ok(block.parts[0].links.length >= 3);
    for (const link of block.parts[0].links) {
      const url = decodeURIComponent(link.url);
      assert.ok(url.includes("2019 Honda Accord"));
      assert.ok(url.includes("Brake pads (front set)"));
    }

    const root = process.cwd();
    const providerSrc = readFileSync(join(root, "lib/server/provider.ts"), "utf8");
    const partsSrc = readFileSync(join(root, "lib/server/parts.ts"), "utf8");
    const fairPriceSrc = readFileSync(join(root, "components/FairPriceQuote.tsx"), "utf8");
    assert.ok(!providerSrc.includes('from "./parts"'), "provider must not import parts");
    assert.ok(!partsSrc.includes('from "./provider"'), "parts must not import provider");
    assert.ok(
      !fairPriceSrc.includes("OpenRouterProvider"),
      "fair-price rendering must not depend on the diagnosis provider",
    );
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});
