import { NextResponse } from "next/server";
import { apiError, readJsonBody } from "@/lib/server/http";
import { getMailer } from "@/lib/server/mailer";
import { requireAuth } from "@/lib/server/routeAuth";
import { createShare } from "@/lib/server/shareService";
import { getIdentityStore } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/diagnoses/[id]/share — mint the public report-card link
 * for one of the signed-in driver's own diagnoses (Pass #20). The
 * link is the share: anyone holding it sees the card, so the token
 * is 192 bits of randomness and the card shows only the report
 * summary. An optional { email } also sends the link through the
 * mailer — the response states the delivery result honestly
 * (sent / not_configured / failed), never a silent claim.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request, ["driver"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await readJsonBody(request)) ?? {};
  } catch (err) {
    return apiError(err);
  }
  try {
    const { token } = await createShare(getIdentityStore(), auth.payload.id, id);
    const url = `${new URL(request.url).origin}/share/${token}`;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    let emailDelivery: string | null = null;
    if (email) {
      const delivery = await getMailer().send({
        to: email,
        subject: "Your MECHA diagnosis report",
        text:
          `Here is the MECHA diagnosis report you asked to share:\n\n${url}\n\n` +
          "The link opens a summary card — the vehicle, the verdict, and the fair-price range. " +
          "It never shows your account or contact details.",
      });
      emailDelivery = delivery.status;
    }
    return NextResponse.json({ status: "ok", url, token, emailDelivery });
  } catch (err) {
    return apiError(err);
  }
}
