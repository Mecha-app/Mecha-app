import { getAppStore } from "@/lib/server/appStore";
import { NotFoundError } from "@/lib/server/errors";
import { apiError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/listings/photos/<id> — serve one uploaded listing photo.
 *
 * Public on purpose: a marketplace photo is public by definition —
 * the marketplace and listing pages render it to signed-out buyers.
 * Uploading is the gated side (POST /api/listings/photos). The bytes
 * are immutable per id, so the response caches hard.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const upload = await getAppStore().getUpload(id);
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
