import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { countUnreadMessages } from "@/lib/server/messageService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/messages/unread-count — the number behind the nav's
 * Messages badge (owner order 2026-11-20: "you won't know if you
 * have a message unless you click on Messages"). Lightweight by
 * design: one count, asked on page load, for the signed-in driver
 * or shop. Zero is a real answer — the client hides the badge.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request, ["driver", "shop"]);
  if ("response" in auth) return auth.response;
  try {
    const unread = await countUnreadMessages(getAppStore(), auth.payload);
    return NextResponse.json({ status: "ok", unread });
  } catch (err) {
    return apiError(err);
  }
}
