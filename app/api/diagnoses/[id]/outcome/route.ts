import { NextResponse } from "next/server";
import { apiError, readJsonBody } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { readOutcome, recordOutcome } from "@/lib/server/shareService";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/diagnoses/[id]/outcome — the driver's own record of what
 * actually fixed the car and what it cost (Pass #20; migration
 * 0017). Owner-only on both verbs: another driver's diagnosis id
 * answers 404, exactly as if it didn't exist.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const outcome = await readOutcome(getIdentityStore(), auth.payload.id, id);
    return NextResponse.json({ status: "ok", outcome });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const outcome = await recordOutcome(getIdentityStore(), auth.payload.id, id, body);
    return NextResponse.json({ status: "ok", outcome }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
