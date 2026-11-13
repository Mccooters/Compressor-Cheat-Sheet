import { getTag, normaliseTag } from "@/lib/assets/tagIndex";
import { toAssetTagJson } from "@/lib/mobile/assetTags";
import { checkMobileToken, mobileJson } from "@/lib/mobile/auth";

/**
 * Looks up one asset tag. A tag the register doesn't know yet triggers a
 * (rate-limited) top-up from AroFlo first, so a barcode typed into AroFlo a
 * minute ago still resolves.
 *
 * 404 with a JSON body means "no asset carries this tag". The app tells
 * that apart from an HTML 404 or a 5xx, which mean "couldn't check".
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tagId: string }> }
) {
  const denied = checkMobileToken(request);
  if (denied) return denied;

  const { tagId: raw } = await params;
  const tagId = normaliseTag(decodeURIComponent(raw));
  if (!tagId) {
    return mobileJson({ error: "Not a valid asset tag" }, 404);
  }

  try {
    const entry = await getTag(tagId);
    if (!entry) {
      return mobileJson({ error: "No asset carries this tag" }, 404);
    }
    return mobileJson(toAssetTagJson(entry));
  } catch (err) {
    // Deliberately not a 404: AroFlo or the database failing is not the
    // same answer as "not registered".
    console.error(`Asset tag lookup failed for ${tagId}:`, err);
    return mobileJson({ error: "Asset tag lookup failed" }, 502);
  }
}
