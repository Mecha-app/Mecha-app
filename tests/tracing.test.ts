/**
 * Langfuse tracing tests (tool stack P1).
 *
 * Pins the module's two contracts:
 *  1. ENV-GATED — no LANGFUSE_* keys → isTracingConfigured() is false and
 *     the trace handle is a true no-op (the diagnosis path is untouched).
 *  2. NEVER FATAL — executeDiagnosis behaves identically with tracing
 *     unwired: success streams a done event, and a provider failure
 *     still propagates to the caller (recordError must not swallow it).
 *
 * No real Langfuse account or network call is involved.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "tracing-test-secret";

import { registerDriver } from "../lib/server/authService";
import { DIAGNOSIS_PROMPT_VERSION } from "../lib/server/ai";
import {
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "../lib/server/diagnoseService";
import {
  StubDiagnosisProvider,
  type DiagnosisProvider,
  type ProviderEvent,
} from "../lib/server/provider";
import { MemoryIdentityStore } from "../lib/server/store";
import { isTracingConfigured, startDiagnosisTrace } from "../lib/server/tracing";

const LANGFUSE_KEYS = ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"] as const;

function clearLangfuseEnv(): void {
  for (const key of LANGFUSE_KEYS) delete process.env[key];
}

async function collect(
  gen: AsyncGenerator<DiagnoseServiceEvent>,
): Promise<DiagnoseServiceEvent[]> {
  const events: DiagnoseServiceEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

test("tracing is configured only with BOTH Langfuse keys", () => {
  assert.equal(isTracingConfigured({}), false);
  assert.equal(isTracingConfigured({ LANGFUSE_PUBLIC_KEY: "pk" }), false);
  assert.equal(isTracingConfigured({ LANGFUSE_SECRET_KEY: "sk" }), false);
  assert.equal(
    isTracingConfigured({ LANGFUSE_PUBLIC_KEY: "pk", LANGFUSE_SECRET_KEY: "sk" }),
    true,
  );
});

test("unwired trace handle is a no-op that always resolves", async () => {
  clearLangfuseEnv();
  const trace = startDiagnosisTrace({
    userId: "user-1",
    tier: "triage",
    promptVersion: DIAGNOSIS_PROMPT_VERSION,
    prompt: "prompt",
  });
  await trace.recordSuccess({
    model: "stub-model",
    report: {
      severity: "Minor — Monitor",
      safeToDriver: true,
      diagnosis: "Nothing serious.",
      estimatedCost: null,
      laborHours: null,
      parts: [],
      steps: [],
      tip: "",
      disclaimer: "",
    },
    latency: { ttftMs: 1, totalMs: 2 },
  });
  await trace.recordError(new Error("boom"));
});

test("diagnosis flow is unchanged with tracing unwired (success)", async () => {
  clearLangfuseEnv();
  const store = new MemoryIdentityStore();
  const provider = new StubDiagnosisProvider();
  await registerDriver(store, {
    name: "Trace Driver",
    email: "trace@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  const user = await store.findUserByEmail("trace@example.com");
  assert.ok(user);
  const events = await collect(
    executeDiagnosis(
      { store, provider },
      { user, request: { problem: "Squeak when I turn the wheel" } },
    ),
  );
  const done = events.filter((e) => e.type === "done");
  assert.equal(done.length, 1, "exactly one done event");
  assert.equal(provider.calls.length, 1);
});

class FailingProvider implements DiagnosisProvider {
  readonly name = "failing";
  async *stream(): AsyncGenerator<ProviderEvent> {
    throw new Error("provider_boom");
  }
}

test("provider failure still propagates with tracing unwired", async () => {
  clearLangfuseEnv();
  const store = new MemoryIdentityStore();
  await registerDriver(store, {
    name: "Fail Driver",
    email: "fail@example.com",
    phone: "(617) 555-0134",
    password: "correct horse battery",
  });
  const user = await store.findUserByEmail("fail@example.com");
  assert.ok(user);
  await assert.rejects(
    collect(
      executeDiagnosis(
        { store, provider: new FailingProvider() },
        { user, request: { problem: "Engine will not start" } },
      ),
    ),
    /provider_boom/,
  );
});
