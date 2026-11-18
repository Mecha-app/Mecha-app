"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGNOSIS_PROMPT_VERSION = exports.AiNotConfiguredError = exports.AI_TIERS = void 0;
exports.isAiConfigured = isAiConfigured;
exports.buildDiagnosisPrompt = buildDiagnosisPrompt;
exports.runDiagnosis = runDiagnosis;
exports.parseReport = parseReport;
// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------
exports.AI_TIERS = {
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
const DISCLAIMER = "MECHA provides AI-assisted information, not a mechanical inspection. " +
    "Have a qualified mechanic confirm any diagnosis before authorizing repairs.";
class AiNotConfiguredError extends Error {
    code = "ai_not_configured";
    constructor() {
        super("ANTHROPIC_API_KEY is not set — the diagnosis engine is not wired in this environment.");
        this.name = "AiNotConfiguredError";
    }
}
exports.AiNotConfiguredError = AiNotConfiguredError;
function isAiConfigured() {
    return typeof process.env.ANTHROPIC_API_KEY === "string" && process.env.ANTHROPIC_API_KEY.length > 0;
}
// ---------------------------------------------------------------------------
// The prompt. Mirrors the repo's /ai prompt so stored results stay in the
// exact shape the legacy data (and the WP5 UI) already uses. Shared by
// the non-streaming runner below and the WP5 streaming provider.
// ---------------------------------------------------------------------------
/**
 * Prompt version tag, recorded on every Langfuse trace (lib/server/
 * tracing.ts) so a weak answer can be tied to the exact prompt that
 * produced it. BUMP THIS whenever buildDiagnosisPrompt changes.
 */
exports.DIAGNOSIS_PROMPT_VERSION = "diagnosis-prompt-v1";
function buildDiagnosisPrompt(req) {
    const language = (req.language ?? "en").trim();
    const langInstruction = language && language !== "en" ? `IMPORTANT: Respond entirely in ${language} language.\n` : "";
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
async function runDiagnosis(req) {
    if (!isAiConfigured())
        throw new AiNotConfiguredError();
    const tier = req.tier === "deep" ? "deep" : "triage";
    const config = exports.AI_TIERS[tier];
    const prompt = buildDiagnosisPrompt(req);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
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
    const data = (await res.json());
    const text = (data.content ?? [])
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("");
    // The repo extracts the first {...} block from the model text — same here.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match)
        throw new Error("diagnosis_parse_failed");
    const report = parseReport(match[0]);
    return { report, model: config.model, tier, source: "model" };
}
/** Defensive parse into the repo shape: core fields required, rest coerced. */
function parseReport(json) {
    const raw = JSON.parse(json);
    if (typeof raw.diagnosis !== "string" || typeof raw.safeToDriver !== "boolean") {
        throw new Error("diagnosis_parse_failed");
    }
    const severity = raw.severity === "Critical" || raw.severity === "Minor — Monitor"
        ? raw.severity
        : "Moderate — Fix Soon";
    const range = (v) => {
        const r = v;
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
        parts: Array.isArray(raw.parts) ? raw.parts.slice(0, 8) : [],
        steps: Array.isArray(raw.steps) ? raw.steps.filter((s) => typeof s === "string") : [],
        tip: typeof raw.tip === "string" ? raw.tip : "",
        disclaimer: DISCLAIMER,
    };
}
