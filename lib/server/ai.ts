/**
 * Diagnosis AI layer (WP3 groundwork) — Anthropic, server-side only.
 *
 * GROUNDED IN THE REPO (reconciliation 2026-11-03; backend/src/routes/
 * diagnoses.js is the source of truth for shapes):
 *   POST /api/diagnoses/ai accepts { problem, vehicleInfo, language }
 *   (vehicleInfo is a free-text "year make model" string; language is a
 *   string — the legacy backend turns any non-'en' value into "Respond
 *   entirely in ${language} language") plus an optional uploaded image,
 *   calls claude-haiku-4-5 with max_tokens 1500, and returns the result
 *   JSON directly. The result shape is defined by that route's prompt —
 *   see DiagnosisReport below; it is stored whole as diagnostics.ai_result.
 *   The legacy flow is AUTHENTICATED with a monthly quota (free 5/mo,
 *   pro effectively unlimited — POST /api/diagnoses/check-limit); quota
 *   and saving belong to the WP5 authenticated flows. This module is the
 *   engine only.
 *
 * TIERED COST ARCHITECTURE (AGENT.md standing decision — never
 * flagship-for-everything) is preserved as CONFIG on top of the repo's
 * single-tier reality: triage defaults to the repo-proven Haiku model;
 * "deep" is the rebuild's Pro-tier addition (charter), with no legacy
 * counterpart. Model IDs are env-overridable (MECHA_AI_MODEL_TRIAGE /
 * MECHA_AI_MODEL_DEEP) — verify at WP8 when the key lands. Never
 * substitute a non-Claude provider without Frantz's explicit say.
 *
 * No key in the environment → AiNotConfiguredError → the route answers
 * the honest 501. No key is ever invented, and keys never ship to the
 * browser (the legacy REACT_APP_ANTHROPIC_API_KEY pattern is gone here).
 *
 * WP5: buildDiagnosisPrompt + parseReport are exported so the streaming
 * provider (lib/server/provider.ts) runs the EXACT same prompt and parse
 * as this module's non-streaming runner — one source of truth for both.
 */

// ---------------------------------------------------------------------------
// Shapes — request mirrors the repo /ai body (+ rebuild tier extension);
// response IS the repo /ai result shape, stored whole in the database.
// ---------------------------------------------------------------------------

export type DiagnosisTier = "triage" | "deep";
export type DiagnosisSeverity = "Critical" | "Moderate — Fix Soon" | "Minor — Monitor";

export interface DiagnosisRequest {
  /** the driver's problem description (repo field: problem) */
  problem: string;
  /** free-text vehicle description, e.g. "2019 Honda Accord" (repo field: vehicleInfo) */
  vehicleInfo?: string;
  /** language string; non-'en' → respond entirely in it (repo field: language) */
  language?: string;
  /** optional dashboard/photo evidence (external path/URL; bytes never stored here) */
  imageUrl?: string;
  /** rebuild extension (charter tiering); default "triage" = the repo's behavior */
  tier?: DiagnosisTier;
}

export interface DiagnosisPart {
  name: string;
  /** a display string in the repo shape, e.g. "$120-240" */
  estimatedCost: string;
  likelihood: "likely" | "conditional";
  description: string;
}

export interface DiagnosisReport {
  severity: DiagnosisSeverity;
  safeToDriver: boolean;
  /** 2–3 sentence plain-language explanation */
  diagnosis: string;
  estimatedCost: { min: number; max: number } | null;
  laborHours: { min: number; max: number } | null;
  parts: DiagnosisPart[];
  steps: string[];
  /** one insider tip */
  tip: string;
  /** server-appended — never taken from the model */
  disclaimer: string;
}

export interface DiagnosisResult {
  report: DiagnosisReport;
  model: string;
  tier: DiagnosisTier;
  source: "model";
}

// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------

export const AI_TIERS: Record<
  DiagnosisTier,
  { model: string; maxTokens: number; description: string }
> = {
  triage: {
    // The exact model the owner's production code runs today (diagnoses.js).
    model: process.env.MECHA_AI_MODEL_TRIAGE ?? "claude-haiku-4-5",
    maxTokens: 1500, // the repo's value
    description: "Haiku-class — the repo's diagnosis engine; default for every request.",
  },
  deep: {
    // Rebuild addition per the charter cost architecture (no legacy tier).
    model: process.env.MECHA_AI_MODEL_DEEP ?? "claude-sonnet-5-5",
    maxTokens: 4000,
    description: "Sonnet-class — deep Pro diagnosis only (WP5, authenticated).",
  },
};

const DISCLAIMER =
  "MECHA provides AI-assisted information, not a mechanical inspection. " +
  "Have a qualified mechanic confirm any diagnosis before authorizing repairs.";

export class AiNotConfiguredError extends Error {
  readonly code = "ai_not_configured";
  constructor() {
    super("ANTHROPIC_API_KEY is not set — the diagnosis engine is not wired in this environment.");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured(): boolean {
  return typeof process.env.ANTHROPIC_API_KEY === "string" && process.env.ANTHROPIC_API_KEY.length > 0;
}

// ---------------------------------------------------------------------------
// The prompt. Mirrors the repo's /ai prompt so stored results stay in the
// exact shape the legacy data (and the WP5 UI) already uses. Shared by
// the non-streaming runner below and the WP5 streaming provider.
// ---------------------------------------------------------------------------

export function buildDiagnosisPrompt(req: DiagnosisRequest): string {
  const language = (req.language ?? "en").trim();
  const langInstruction =
    language && language !== "en" ? `IMPORTANT: Respond entirely in ${language} language.\n` : "";

  return `${langInstruction}You are MECHA, an expert automotive AI diagnostic assistant. Analyze this car problem and respond with ONLY a valid JSON object.

Vehicle: ${req.vehicleInfo || "Unknown"}
Problem: ${req.problem}${req.imageUrl ? `\nThe driver also provided a photo of the issue: ${req.imageUrl}` : ""}

Return JSON:
{
  "severity": "Critical"|"Moderate — Fix Soon"|"Minor — Monitor",
  "safeToDriver": true|false,
  "diagnosis": "2-3 sentence plain language explanation",
  "estimatedCost": {"min": number, "max": number},
  "laborHours": {"min": number, "max": number},
  "parts": [{"name": "part name", "estimatedCost": "$X-Y", "likelihood": "likely"|"conditional", "description": "brief description"}],
  "steps": ["step 1", "step 2"],
  "tip": "one insider tip"
}`;
}

// ---------------------------------------------------------------------------
// Non-streaming runner. Throws AiNotConfiguredError when no key is
// configured. (The WP5 route uses the streaming provider instead; this
// runner remains for parity checks and non-streaming callers.)
// ---------------------------------------------------------------------------

export async function runDiagnosis(req: DiagnosisRequest): Promise<DiagnosisResult> {
  if (!isAiConfigured()) throw new AiNotConfiguredError();

  const tier: DiagnosisTier = req.tier === "deep" ? "deep" : "triage";
  const config = AI_TIERS[tier];
  const prompt = buildDiagnosisPrompt(req);

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
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`anthropic_http_${res.status}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");

  // The repo extracts the first {...} block from the model text — same here.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("diagnosis_parse_failed");
  const report = parseReport(match[0]);
  return { report, model: config.model, tier, source: "model" };
}

/** Defensive parse into the repo shape: core fields required, rest coerced. */
export function parseReport(json: string): DiagnosisReport {
  const raw = JSON.parse(json) as Partial<DiagnosisReport>;
  if (typeof raw.diagnosis !== "string" || typeof raw.safeToDriver !== "boolean") {
    throw new Error("diagnosis_parse_failed");
  }
  const severity: DiagnosisSeverity =
    raw.severity === "Critical" || raw.severity === "Minor — Monitor"
      ? raw.severity
      : "Moderate — Fix Soon";
  const range = (v: unknown): { min: number; max: number } | null => {
    const r = v as { min?: unknown; max?: unknown } | null;
    return r && typeof r.min === "number" && typeof r.max === "number"
      ? { min: r.min, max: r.max }
      : null;
  };
  return {
    severity,
    safeToDriver: raw.safeToDriver,
    diagnosis: raw.diagnosis,
    estimatedCost: range(raw.estimatedCost),
    laborHours: range(raw.laborHours),
    parts: Array.isArray(raw.parts) ? (raw.parts.slice(0, 8) as DiagnosisPart[]) : [],
    steps: Array.isArray(raw.steps) ? raw.steps.filter((s) => typeof s === "string") : [],
    tip: typeof raw.tip === "string" ? raw.tip : "",
    disclaimer: DISCLAIMER,
  };
}
