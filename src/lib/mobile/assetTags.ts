import type { AssetTagEntry } from "@/lib/assets/tagIndex";

/** Wire shape of one asset-tag entry — see docs/mobile-api.md. */
export function toAssetTagJson(entry: AssetTagEntry) {
  return {
    tagId: entry.tagId,
    arofloAssetId: entry.arofloAssetId,
    name: entry.name,
    serialNumber: entry.serialNumber,
    clientName: entry.clientName,
    updatedAt: entry.updatedAt.toISOString(),
  };
}
