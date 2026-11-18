import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/routeAuth";
import { readDiagnosisDetail } from "@/lib/server/shareService";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/diagnoses/[id] — one saved diagnosis read back whole for
 * its owner (Pass #20b), plus the outcome recorded against it. This
 * is the read the detail view (/app/diagnoses/[id]) renders: the
 * STORED record, so what the driver sees there — verdict, summary,
 * fair-price range — is exactly what the run produced and what the
 * history lists and the share card show. Owner-only: another
 * driver's diagnosis id answers 404, exactly as if it didn't exist.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const { diagnosis, outcome, shareToken } = await readDiagnosisDetail(
      getIdentityStore(),
      auth.payload.id,
      id,
    );
    return NextResponse.json({ status: "ok", diagnosis, outcome, shareToken });
  } catch (err) {
    return apiError(err);
  }
}
