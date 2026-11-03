import { NextResponse } from "next/server";
import {
  AiNotConfiguredError,
  runDiagnosis,
  type DiagnosisRequest,
} from "@/lib/server/ai";

/**
 * POST /api/diagnose — the rebuild's diagnosis entry point, grounded in
 * the repo's POST /api/diagnoses/ai (backend/src/routes/diagnoses.js):
 * body { problem, vehicleInfo, language } (+ optional imageUrl, + the
 * rebuild's tier extension), result in the repo's exact response shape.
 *
 * Differences from legacy, by design: the legacy route is authenticated
 * with a monthly quota and the caller saves the result separately
 * (POST /api/diagnoses) — quota + saving land with WP5 auth; this public
 * groundwork route validates, rate-limits, and runs the engine. With no
 * ANTHROPIC_API_KEY in the environment it answers the honest 501 — no AI
 * call is made and no answer is invented. Keys live server-side only.
 */

// Anonymous guard for the public surface (charter cost architecture).
// NOTE: serverless instances are per-process, so this is a coarse
// per-instance limiter; the durable quota is the repo's per-account
// monthly limit (free 5 / pro 999), enforced at WP5 with auth.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(request: Request): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = (body ?? {}) as Partial<DiagnosisRequest>;
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

  const req: DiagnosisRequest = {
    problem,
    vehicleInfo: str(b.vehicleInfo, 300),
    language: str(b.language, 64),
    imageUrl: str(b.imageUrl, 1024),
    tier: b.tier,
  };

  try {
    const result = await runDiagnosis(req);
    return NextResponse.json(
      { status: "ok", tier: result.tier, model: result.model, source: result.source, report: result.report },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json(
        {
          status: "unavailable",
          error: "ai_not_configured",
          detail: "The diagnosis engine is not wired in this environment yet — no AI call was made.",
          request: { tier: req.tier ?? "triage" },
        },
        { status: 501 },
      );
    }
    return NextResponse.json(
      { status: "error", error: "diagnosis_failed", detail: "The diagnosis could not be completed." },
      { status: 502 },
    );
  }
}
