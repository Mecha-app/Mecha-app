import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/server/db";
import { isAiConfigured } from "@/lib/server/ai";

/**
 * API liveness probe — replaces the crash-looping Render /api/health.
 * Also reports capability state honestly: which WP3 layers are wired in
 * this environment (configured) and which are not (not_configured).
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "mecha-api",
    phase: "WP3",
    database: isDatabaseConfigured() ? "configured" : "not_configured",
    ai: isAiConfigured() ? "configured" : "not_configured",
  });
}
