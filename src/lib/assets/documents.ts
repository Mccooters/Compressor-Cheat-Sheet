import { unstable_cache } from "next/cache";
import { legacyGet } from "@/lib/aroflo/legacy";

/**
 * Documents attached to an asset in AroFlo.
 *
 * Only AroFlo's older API can list these. Everything attached to the ASSET
 * is treated as public, because the asset page is public: put a file on
 * the asset only if anyone who scans the sticker may read it. Documents on
 * a job (quotes, purchase orders, invoices) are never shown.
 *
 * AroFlo's download links are pre-signed and expire after about ten
 * minutes, so the page never embeds them — it links to our own
 * /a/{tag}/docs/{key} route, which fetches a fresh link at click time.
 */

type LegacyDocument = {
  documentid?: string;
  name?: string;
  url?: string;
  uploadeddatetime?: string;
};

export type AssetFile = {
  /** URL-safe form of AroFlo's document ID. */
  key: string;
  name: string;
  /** "yyyy/MM/dd HH:mm:ss" in UTC, as AroFlo sends it. */
  uploaded: string | null;
  url: string | null;
};

export const toDocumentKey = (documentId: string) =>
  Buffer.from(documentId, "utf-8").toString("base64url");

/** The join comes back as a list, or wrapped in an object, depending on the row. */
function unwrap(value: unknown): LegacyDocument[] {
  if (Array.isArray(value)) return value as LegacyDocument[];
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) {
      if (Array.isArray(inner)) return inner as LegacyDocument[];
      if (inner && typeof inner === "object" && "documentid" in inner) {
        return [inner as LegacyDocument];
      }
    }
  }
  return [];
}

/** Always a live read — use this when the download link itself is needed. */
export async function fetchAssetFiles(legacyAssetId: string): Promise<AssetFile[]> {
  const response = await legacyGet<{ assets?: { documentsandphotos?: unknown }[] }>({
    zone: "assets",
    where: [`and|assetid|=|${legacyAssetId}`],
    join: ["documentsandphotos"],
    page: 1,
    pageSize: 1,
  });

  return unwrap(response.assets?.[0]?.documentsandphotos)
    .filter((doc) => doc.documentid && doc.name)
    .map((doc) => ({
      key: toDocumentKey(String(doc.documentid)),
      name: String(doc.name),
      uploaded: doc.uploadeddatetime ?? null,
      url: doc.url ?? null,
    }));
}

/** For rendering the list: cached, since names and dates don't expire. */
export const listAssetFiles = unstable_cache(
  async (legacyAssetId: string) =>
    (await fetchAssetFiles(legacyAssetId)).map(({ key, name, uploaded }) => ({
      key,
      name,
      uploaded,
    })),
  ["asset-files"],
  { revalidate: 600 }
);
