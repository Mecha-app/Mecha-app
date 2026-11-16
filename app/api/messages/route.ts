import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { getIdentityStore } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/routeAuth";
import { listThreads, postMessage } from "@/lib/server/messageService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/messages — thread list (GET) + send (POST) for the signed-in
 * driver or shop. Threads are addressed by the counterpart, never by
 * an arbitrary thread id: a caller can only ever see its own side.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["driver", "shop"]);
  if ("response" in auth) return auth.response;
  try {
    const threads = await listThreads(getAppStore(), auth.payload);
    return NextResponse.json({ status: "ok", threads });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request) {
  const auth = requireAuth(request, ["driver", "shop"]);
  if ("response" in auth) return auth.response;
  let body;
  try {
    body = await readJsonBody(request);
  } catch (err) {
    return apiError(err);
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  try {
    const message = await postMessage(getAppStore(), getIdentityStore(), auth.payload, body);
    return NextResponse.json({ status: "ok", message }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
