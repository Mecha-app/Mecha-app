import { NextResponse } from "next/server";
import { AiNotConfiguredError, type DiagnosisRequest } from "@/lib/server/ai";
import {
  PhoneRequiredError,
  ProRequiredError,
  executeDiagnosis,
  type DiagnoseServiceEvent,
} from "@/lib/server/diagnoseService";
import { PayloadTooLargeError, apiError, readJsonBody } from "@/lib/server/http";
import { AuthNotConfiguredError, bearerPayload, isAuthConfigured } from "@/lib/server/jwt";
import { getDiagnosisProvider } from "@/lib/server/provider";
import { QuotaExhaustedError } from "@/lib/server/quota";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/diagnose — THE authenticated diagnosis (WP5), replacing the
 * WP3 public groundwork stub. Grounded in the repo's POST
 * /api/diagnoses/ai, with the owner's hard rules wired in:
 *
 *   - Auth: JWT Bearer required (401 without). No anonymous diagnoses —
 *     a diagnosis costs the owner real money per call.
 *   - Quota: 5 free per identity, LIFETIME, persisted server-side,
 *     consumed atomically BEFORE the AI provider is called. At zero the
 *     answer is 402 quota_exhausted with the plain subscribe message —
 *     the provider is never invoked for a blocked user.
 *   - Countdown: the stream opens with a `quota` event and closes with
 *     a `done` event, both carrying the remaining count + message.
 *   - Speed: the response STREAMS (SSE). First event is immediate;
 *     `delta` events carry the model's text as it generates; `done`
 *     carries the parsed report + measured latency.
 *   - Honest unwired states: no JWT_SECRET → 501 auth_not_configured;
 *     no DATABASE_URL → 501 database_not_configured; no
 *     ANTHROPIC_API_KEY → 501 ai_not_configured (checked BEFORE the
 *     quota consume, so an unwired environment never burns a free slot).
 *
 * Body: { problem, vehicleInfo?, language?, imageUrl?, tier?,
 *         vehicleId? } — the repo /ai fields (+ rebuild extensions).
 */

// Coarse per-instance abuse guard (the durable limit is the per-account
// quota above; serverless instances are per-process, so this is a
// second, deliberately rough layer — same as the WP3 stub had).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(request: Request): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function badRequest(detail: string) {
  return NextResponse.json({ error: "invalid_request", detail }, { status: 400 });
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : undefined;
}

const NL = String.fromCharCode(10);

function sseChunk(event: DiagnoseServiceEvent): string {
  return `event: ${event.type}${NL}data: ${JSON.stringify(event)}${NL}${NL}`;
}

export async function POST(request: Request) {
  // Capped JSON read (security pass): a diagnosis request is a few KB
  // of text fields — anything larger is abuse, answered 413.
  let body: Record<string, unknown> | null;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { error: err.code, detail: "Request body too large." },
        { status: 413 },
      );
    }
    throw err;
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const b = body as Partial<DiagnosisRequest> & { vehicleId?: unknown };
  const problem = typeof b.problem === "string" ? b.problem.trim() : "";
  if (!problem) {
    return badRequest('Body must include a non-empty "problem" string (the repo /ai field).');
  }
  if (problem.length > 4000) return badRequest('"problem" exceeds 4000 characters.');
  if (b.tier !== undefined && b.tier !== "triage" && b.tier !== "deep") {
    return badRequest('tier must be "triage" or "deep" when provided.');
  }

  if (rateLimited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many diagnosis requests — try again in a minute." },
      { status: 429 },
    );
  }

  try {
    if (!isAuthConfigured()) throw new AuthNotConfiguredError();
    const payload = bearerPayload(request);
    if (!payload || payload.type !== "driver") {
      return NextResponse.json(
        { error: "unauthorized", detail: "Sign in to run a diagnosis." },
        { status: 401 },
      );
    }
    const store = getIdentityStore();
    const user = await store.findUserById(payload.id);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const provider = getDiagnosisProvider();
    if (!provider) throw new AiNotConfiguredError();

    const req: DiagnosisRequest = {
      problem,
      vehicleInfo: str(b.vehicleInfo, 300),
      language: str(b.language, 64),
      imageUrl: str(b.imageUrl, 1024),
      tier: b.tier,
    };
    const vehicleId = str(b.vehicleId, 64);

    const generator = executeDiagnosis({ store, provider }, { user, request: req, vehicleId });

    // Pull the first event before committing to a stream: the quota
    // gate throws here (before any byte is sent) when the identity is
    // exhausted, which maps to a clean 402 instead of a broken stream.
    const first = await generator.next();
    if (first.done) {
      return NextResponse.json({ status: "error", error: "diagnosis_failed" }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(sseChunk(first.value)));
          for await (const event of generator) {
            controller.enqueue(encoder.encode(sseChunk(event)));
          }
        } catch {
          const errorEvent = {
            type: "error",
            error: "diagnosis_failed",
            detail: "The diagnosis could not be completed.",
          } as unknown as DiagnoseServiceEvent;
          controller.enqueue(encoder.encode(sseChunk(errorEvent)));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof QuotaExhaustedError) {
      return NextResponse.json(
        {
          status: "blocked",
          error: err.code,
          detail: err.message,
          quota: err.quota,
          message: err.message,
        },
        { status: 402 },
      );
    }
    if (err instanceof ProRequiredError) {
      return NextResponse.json({ error: err.code, detail: err.message }, { status: 403 });
    }
    if (err instanceof PhoneRequiredError) {
      return NextResponse.json({ error: err.code, detail: err.message }, { status: 403 });
    }
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json(
        {
          status: "unavailable",
          error: err.code,
          detail: "The diagnosis engine is not wired in this environment yet — no AI call was made.",
        },
        { status: 501 },
      );
    }
    return apiError(err);
  }
}
