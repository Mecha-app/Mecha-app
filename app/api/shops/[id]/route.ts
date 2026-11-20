import { NextResponse } from "next/server";
import { getAppStore } from "@/lib/server/appStore";
import { NotFoundError } from "@/lib/server/errors";
import { apiError } from "@/lib/server/http";
import {
  getPublicBusinessProfile,
  listPublicReviews,
} from "@/lib/server/publicProfileService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/shops/<id> — the public shop profile (owner order
 * 2026-11-20): the page a driver opens from the nearby/ZIP/towing
 * results. Name, the phone drivers call, the business email, the
 * full address, hours/specialties/about, the logo, and — for shops —
 * the real reviews with the average the shop row carries (recomputed
 * from the review rows on every write). Towing companies resolve
 * here too, with an empty review list (reviews are shops-only).
 * Public like /api/nearby — it shows nothing the list doesn't.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const store = getAppStore();
    const profile = await getPublicBusinessProfile(store, id);
    if (!profile) throw new NotFoundError("That business does not exist.");
    const reviews =
      profile.kind === "shop" ? await listPublicReviews(store, id) : [];
    return NextResponse.json({ status: "ok", profile, reviews });
  } catch (err) {
    return apiError(err);
  }
}
