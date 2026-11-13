import { fetchAssetFiles } from "@/lib/assets/documents";
import { getTag, normaliseTag } from "@/lib/assets/tagIndex";

/**
 * Opens one of an asset's documents. AroFlo's download links expire after
 * about ten minutes, so this fetches a fresh one at click time and
 * redirects to it, rather than the page carrying a link that may be dead
 * by the time it's tapped.
 */
export const dynamic = "force-dynamic";

const notFound = () => new Response("Document not found", { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; key: string }> }
) {
  const { id, key } = await params;
  const tagId = normaliseTag(decodeURIComponent(id));
  if (!tagId) return notFound();

  try {
    const entry = await getTag(tagId);
    if (!entry?.legacyAssetId) return notFound();

    // Only ever redirect to a document that is on this asset.
    const file = (await fetchAssetFiles(entry.legacyAssetId)).find((f) => f.key === key);
    if (!file?.url) return notFound();

    return Response.redirect(file.url, 302);
  } catch (err) {
    console.error(`Failed to open document for ${tagId}:`, err);
    return new Response("Document unavailable", { status: 502 });
  }
}
