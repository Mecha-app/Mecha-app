import { NextResponse } from "next/server";
import { PayloadTooLargeError, apiError, readJsonBody } from "@/lib/server/http";
import {
  buildPartsBlock,
  type PartsDiagnosisInput,
  type PartsVehicleInput,
} from "@/lib/server/parts";
import { createRateLimiter } from "@/lib/server/ratelimit";
import { requireAuth } from "@/lib/server/routeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/parts/links — the post-diagnosis parts block (owner's
 * affiliate model, 2026-11-03). A PURE TRANSFORM over a FINISHED
 * diagnosis: the client sends the report it already holds plus the
 * vehicle, and gets back the "What to do next" render data —
 * fitment-aware retailer search links, the always-present commission
 * disclosure, and the two doors (order the parts / shops near you).
 *
 * Diagnosis integrity (hard rule): this route never calls the
 * diagnosis engine, never touches the prompt, ranking, or verdict —
 * lib/server/parts.ts consumes the finished output only, and nothing
 * in the diagnosis stack imports it. A blocked or exhausted user
 * loses nothing here and gains nothing here; the quota lives entirely
 * in /api/diagnose.
 *
 * Auth: any signed-in account. Drivers get the DIY framing; business
 * accounts (shop / towing) get the shop-ordering framing — their
 * recurring-basket use of the same block. Body is validated
 * defensively: the report parts are coerced into the parts input
 * shape, never trusted as-is.
 *
 * Body: { report: { parts: [...] }, vehicle?: { year?, make?,
 *         model?, engine?, vehicleInfo? } }
 */

// Cheap pure transform, but it is an authenticated surface — keep a
// coarse per-IP cap in the house pattern.
const limiter = createRateLimiter({ windowMs: 60_000, max: 60 });

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : undefined;
}

function coerceDiagnosis(body: Record<string, unknown>): PartsDiagnosisInput | null {
  const report = body.report;
  if (!report || typeof report !== "object" || Array.isArray(report)) return null;
  const rawParts = (report as Record<string, unknown>).parts;
  if (!Array.isArray(rawParts)) return null;
  const parts: PartsDiagnosisInput["parts"][number][] = [];
  for (const raw of rawParts.slice(0, 8)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const r = raw as Record<string, unknown>;
    const name = str(r.name, 200);
    if (!name) continue;
    parts.push({
      name,
      estimatedCost: str(r.estimatedCost, 64) ?? "",
      likelihood: r.likelihood === "likely" ? "likely" : "conditional",
      description: str(r.description, 600) ?? "",
    });
  }
  return { parts };
}

function coerceVehicle(body: Record<string, unknown>): PartsVehicleInput {
  const v = body.vehicle;
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const r = v as Record<string, unknown>;
  const yearRaw = typeof r.year === "number" ? r.year : str(r.year, 8);
  return {
    year: yearRaw !== undefined ? String(yearRaw) : undefined,
    make: str(r.make, 64),
    model: str(r.model, 96),
    engine: str(r.engine, 64),
    vehicleInfo: str(r.vehicleInfo, 300),
  };
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if ("response" in auth) return auth.response;
  if (limiter.limited(request)) {
    return NextResponse.json(
      { error: "rate_limited", detail: "Too many requests — try again in a minute." },
      { status: 429 },
    );
  }

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

  try {
    const diagnosis = coerceDiagnosis(body);
    if (!diagnosis) {
      return NextResponse.json(
        {
          error: "invalid_request",
          detail: 'Body must include "report" with a "parts" array — the finished diagnosis.',
        },
        { status: 400 },
      );
    }
    const block = buildPartsBlock({
      diagnosis,
      vehicle: coerceVehicle(body),
      audience: auth.payload.type === "driver" ? "driver" : "shop",
    });
    return NextResponse.json({ status: "ok", block });
  } catch (err) {
    return apiError(err);
  }
}
