import { getAppStore } from "@/lib/server/appStore";
import { NotFoundError } from "@/lib/server/errors";
import { apiError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/business/logo/<id> — serve one business logo upload.
 *
 * Public on purpose, like listing photos: the nearby list and the
 * shop profile page render logos to drivers, signed in or not. The
 * bytes are immutable per id (a replace mints a new id), so the
 * response caches hard. Uploading/removing is the gated side
 * (POST/DELETE /api/business/logo).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundError("That photo does not exist.");
    }
    const upload = await getAppStore().getBusinessUpload(id);
    if (!upload) throw new NotFoundError("That photo does not exist.");
    return new Response(new Uint8Array(upload.data), {
      status: 200,
      headers: {
        "content-type": upload.contentType,
        "content-length": String(upload.data.length),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
