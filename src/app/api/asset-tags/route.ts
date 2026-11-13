import { listTags } from "@/lib/assets/tagIndex";
import { toAssetTagJson } from "@/lib/mobile/assetTags";
import { checkMobileToken, mobileJson } from "@/lib/mobile/auth";

/**
 * The shared asset-tag register: every QR tag that an AroFlo asset carries
 * in its Barcode field, with the AroFlo (API v2) asset ID it resolves to.
 * Apps download this instead of searching AroFlo for barcodes themselves.
 * Contract in docs/mobile-api.md.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = checkMobileToken(request);
  if (denied) return denied;

  try {
    const tags = await listTags();
    return mobileJson({
      generatedAt: new Date().toISOString(),
      tags: tags.map(toAssetTagJson),
    });
  } catch (err) {
    console.error("Failed to list asset tags:", err);
    return mobileJson({ error: "Failed to list asset tags" }, 500);
  }
}
