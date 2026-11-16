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
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AnthropicVisionProvider,
  OPENROUTER_VISION_MODEL_DEFAULT,
  OpenRouterVisionProvider,
  VisionProviderError,
  getWarningLightProvider,
} from "../lib/server/vision";

const ENV_KEYS = [
  "AI_PROVIDER",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "MECHA_MODEL_VISION_OPENROUTER",
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

function installFetch(response: Response): void {
  fetchCalls.length = 0;
  (globalThis as unknown as { fetch: unknown }).fetch = async (
    url: string,
    init?: RequestInit,
  ) => {
    fetchCalls.push({ url, init });
    return response;
  };
}

function restoreFetch(): void {
  (globalThis as unknown as { fetch: unknown }).fetch = originalFetch;
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

function chatCompletion(content: string): Response {
  return new Response(
    JSON.stringify({
      id: "gen-vision-fixture",
      model: OPENROUTER_VISION_MODEL_DEFAULT,
      choices: [{ index: 0, message: { role: "assistant", content } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const IMAGE = { imageBase64: "ZmFrZS1pbWFnZQ==", mediaType: "image/jpeg" };

test("vision selection follows AI_PROVIDER: OpenRouter wins when explicitly selected", () => {
  const env = snapshotEnv();
  clearProviderEnv();

  try {
    assert.equal(getWarningLightProvider(), null, "no configured provider returns null");

    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    const fallback = getWarningLightProvider();
    assert.ok(fallback instanceof AnthropicVisionProvider, "default stays Anthropic");

    process.env.AI_PROVIDER = "openrouter";
    assert.equal(
      getWarningLightProvider(),
      null,
      "explicit OpenRouter selection must not silently fall back when its key is absent",
    );

    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    const selected = getWarningLightProvider();
    assert.ok(
      selected instanceof OpenRouterVisionProvider,
      "an OpenRouter-only key set is configured for vision",
    );

    delete process.env.ANTHROPIC_API_KEY;
    assert.ok(
      getWarningLightProvider() instanceof OpenRouterVisionProvider,
      "vision stays wired with no Anthropic key at all",
    );

    delete process.env.AI_PROVIDER;
    assert.equal(
      getWarningLightProvider(),
      null,
      "unsetting AI_PROVIDER restores the Anthropic default — and its missing key is unwired",
    );
  } finally {
    restoreEnv(env);
  }
});

test("OpenRouter vision: request shape and success parsing into lights", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  installFetch(chatCompletion(RESULT_JSON));

  try {
    const provider = new OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
    const result = await provider.identify(IMAGE);

    assert.equal(result.lights.length, 2);
    assert.equal(result.lights[0].name, "Check Engine Light");
    assert.equal(result.lights[0].severity, "Moderate — Fix Soon");
    assert.equal(result.lights[1].name, "Oil Pressure Warning");
    assert.equal(result.lights[1].severity, "Critical");
    assert.equal(result.odometerMiles, 45210);
    assert.equal(result.note, "Engine running.");

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(fetchCalls[0].init?.method, "POST");
    const headers = fetchCalls[0].init?.headers as Record<string, string>;
    assert.equal(headers.authorization, "Bearer openrouter-test-key");
    assert.equal(headers["content-type"], "application/json");

    const body = JSON.parse(String(fetchCalls[0].init?.body)) as {
      model: string;
      max_tokens: number;
      messages: Array<{
        role: string;
        content: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;
      }>;
    };
    assert.equal(body.model, OPENROUTER_VISION_MODEL_DEFAULT);
    assert.equal(body.model, "anthropic/claude-haiku-4.5");
    assert.equal(body.max_tokens, 1200, "keeps the Anthropic reader's token parity");
    assert.equal(body.messages.length, 1);
    assert.equal(body.messages[0].role, "user");
    assert.equal(body.messages[0].content.length, 2);
    const [textPart, imagePart] = body.messages[0].content;
    assert.equal(textPart.type, "text");
    if (textPart.type === "text") {
      assert.ok(textPart.text.length > 0, "the shared warning-light prompt is sent");
    }
    assert.equal(imagePart.type, "image_url");
    if (imagePart.type === "image_url") {
      assert.equal(
        imagePart.image_url.url,
        `data:image/jpeg;base64,${IMAGE.imageBase64}`,
        "the photo travels as a data URL, never stored",
      );
    }
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("OpenRouter vision: model override is honored", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  process.env.MECHA_MODEL_VISION_OPENROUTER = "example/vision-eval-model";
  installFetch(chatCompletion(RESULT_JSON));

  try {
    const provider = new OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
    await provider.identify(IMAGE);
    const body = JSON.parse(String(fetchCalls[0].init?.body)) as { model: string };
    assert.equal(body.model, "example/vision-eval-model");
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("OpenRouter vision: non-OK status maps to VisionProviderError with the status", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  installFetch(new Response("insufficient credits", { status: 402 }));

  try {
    const provider = new OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
    await assert.rejects(provider.identify(IMAGE), (err: unknown) => {
      assert.ok(err instanceof VisionProviderError);
      assert.equal(err.code, "vision_failed");
      assert.ok(err.message.includes("402"), "the HTTP status rides the error, like Anthropic's");
      return true;
    });
    assert.equal(fetchCalls.length, 1);
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});

test("OpenRouter vision: an unparseable answer maps to VisionProviderError", async () => {
  const env = snapshotEnv();
  clearProviderEnv();
  process.env.OPENROUTER_API_KEY = "openrouter-test-key";
  installFetch(chatCompletion("I cannot make out any lights in this photo."));

  try {
    const provider = new OpenRouterVisionProvider(process.env.OPENROUTER_API_KEY);
    await assert.rejects(provider.identify(IMAGE), (err: unknown) => {
      assert.ok(err instanceof VisionProviderError);
      assert.equal(err.code, "vision_failed");
      return true;
    });
  } finally {
    restoreFetch();
    restoreEnv(env);
  }
});
