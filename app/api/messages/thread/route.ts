import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { getThread } from "@/lib/server/messageService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/messages/thread?shopId=… (driver) or ?userId=… (shop) —
 * the full conversation, oldest first. Opening a thread marks the
 * other side's messages read for the caller.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["driver", "shop"]);
  if ("response" in auth) return auth.response;
  const url = new URL(request.url);
  try {
    const thread = await getThread(getAppStore(), auth.payload, {
      shopId: url.searchParams.get("shopId"),
      userId: url.searchParams.get("userId"),
    });
    return NextResponse.json({ status: "ok", ...thread });
  } catch (err) {
    return apiError(err);
  }
}
