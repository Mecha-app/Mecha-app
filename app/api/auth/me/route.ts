import { NextResponse } from "next/server";
import { publicUser, quotaOf } from "@/lib/server/authService";
import { publicShop } from "@/lib/server/businessService";
import { shopCountdownMessage, shopQuotaStateFor } from "@/lib/server/credits";
import { apiError } from "@/lib/server/http";
import { bearerPayload, isAuthConfigured, AuthNotConfiguredError } from "@/lib/server/jwt";
import { countdownMessage } from "@/lib/server/quota";
import { getAppStore } from "@/lib/server/appStore";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me — the signed-in account + its live quota state.
 * This is where the app reads the free-diagnosis countdown on load:
 * the number comes from the server record, never from the browser.
 */
export async function GET(request: Request) {
  try {
    if (!isAuthConfigured()) throw new AuthNotConfiguredError();
    const payload = bearerPayload(request);
    if (!payload) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // SHOP accounts (2026-11-19): the diagnose screen seeds from this
    // route for every account kind — a shop reads its trial/plan
    // quota here (its profile comes from the AppStore record, its
    // credit counters from the identity record).
    if (payload.type === "shop") {
      const identity = await getIdentityStore().findShopById(payload.id);
      const profile = await getAppStore().findShopProfileById(payload.id);
      if (!identity || !profile) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const quota = shopQuotaStateFor(identity);
      return NextResponse.json({
        status: "ok",
        accountKind: "shop",
        business: publicShop(profile),
        quota,
        message: shopCountdownMessage(quota),
      });
    }
    const user = await getIdentityStore().findUserById(payload.id);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const quota = quotaOf(user);
    return NextResponse.json({
      status: "ok",
      user: publicUser(user),
      quota,
      message: countdownMessage(quota),
    });
  } catch (err) {
    return apiError(err);
  }
}
