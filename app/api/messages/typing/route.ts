import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError, readJsonBody } from "@/lib/server/http";
import { getIdentityStore } from "@/lib/server/store";
import { requireAuth } from "@/lib/server/routeAuth";
import { pingTyping } from "@/lib/server/messageService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/messages/typing — the typing heartbeat (live chat,
 * owner order 2026-11-20). The client pings while its composer
 * holds unsent text in an open thread; each ping extends the
 * caller's "typing" expiry a few seconds. The other side sees it
 * on its next thread poll as `counterpartTyping`. Addressed by
 * counterpart exactly like posting: { shopId } for a driver,
 * { userId } for a shop.
 */
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
    const result = await pingTyping(
      getAppStore(),
      getIdentityStore(),
      auth.payload,
      body,
    );
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    return apiError(err);
  }
}
