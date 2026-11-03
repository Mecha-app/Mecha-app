import { NextResponse } from "next/server";
import { loginDriver } from "@/lib/server/authService";
import { apiError, readJsonBody } from "@/lib/server/http";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login — email + password → 30-day JWT Bearer token
 * (legacy contract). The response carries the account's quota state so
 * the app can show the free-diagnosis countdown immediately.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const result = await loginDriver(getIdentityStore(), body);
    return NextResponse.json({ status: "ok", ...result }, { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
