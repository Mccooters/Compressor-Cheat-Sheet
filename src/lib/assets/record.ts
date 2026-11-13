import { ArofloError, arofloGet, isArofloConfigured } from "@/lib/aroflo/client";
import { isLegacyConfigured } from "@/lib/aroflo/legacy";
import { listAssetFiles } from "@/lib/assets/documents";
import { forgetTag, getTag, normaliseTag } from "@/lib/assets/tagIndex";
import type { AssetDocument, AssetRecord } from "@/lib/assets/types";

// A scan costs two AroFlo requests; cached, a busy tag still costs two per
// window rather than two per visitor.
const CACHE_SECONDS = 600;

type ArofloAsset = {
  id: string;
  name: string;
  barcode: string | null;
  status: "ACTIVE" | "ARCHIVED";
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  categoryPath: string | null;
  assetTypes?: { name: string; archived: boolean }[];
  client?: { name: string | null } | null;
};

type ArofloTask = {
  jobNumber: number | null;
  name: string | null;
  status: string | null;
  completionDate: string | null;
  dueDate: string | null;
};

export type AssetLookup =
  | { state: "found"; asset: AssetRecord }
  | { state: "unregistered" }
  /** AroFlo isn't configured or didn't answer — not the same as "no such asset". */
  | { state: "unavailable" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** AroFlo task dates are local, zone-less ("2026-11-11T00:00:00") — format the date part as written. */
function formatDate(value: string | null): string | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return null;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

const EXTENSION_KIND: Record<string, string> = {
  pdf: "PDF",
  jpg: "Photo",
  jpeg: "Photo",
  png: "Photo",
  heic: "Photo",
};

/** AroFlo upload times are UTC "yyyy/MM/dd HH:mm:ss". */
function formatUploaded(value: string | null): string {
  const match = value ? /^(\d{4})\/(\d{2})\/(\d{2})/.exec(value) : null;
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : "";
}

/**
 * Documents are a bonus: if the older AroFlo API isn't set up or doesn't
 * answer, the rest of the record still shows.
 */
async function loadDocuments(
  tagId: string,
  legacyAssetId: string | null
): Promise<AssetDocument[]> {
  if (!legacyAssetId || !isLegacyConfigured()) return [];
  try {
    const files = await listAssetFiles(legacyAssetId);
    return files.map((file) => ({
      title: file.name,
      kind: EXTENSION_KIND[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "Document",
      date: formatUploaded(file.uploaded),
      href: `/a/${tagId}/docs/${file.key}`,
    }));
  } catch (err) {
    console.error(`Failed to list documents for ${tagId}:`, err);
    return [];
  }
}

const FINISHED = new Set(["COMPLETED", "ARCHIVED"]);

export async function getAssetByTag(tagId: string): Promise<AssetLookup> {
  if (!isArofloConfigured()) return { state: "unavailable" };

  try {
    const entry = await getTag(tagId);
    if (!entry) return { state: "unregistered" };
    const arofloId = entry.arofloAssetId;

    const [asset, tasks] = await Promise.all([
      arofloGet<ArofloAsset>(`/assets/${arofloId}`, { revalidateSeconds: CACHE_SECONDS }),
      arofloGet<{ items: ArofloTask[] }>(
        `/tasks?assetId=${arofloId}&sortBy=completiondate&ascending=false&limit=20` +
          `&_fields=jobNumber,name,status,completionDate,dueDate`,
        { revalidateSeconds: CACHE_SECONDS }
      ),
    ]);

    // The index is only a hint: if the barcode has since been edited or
    // cleared in AroFlo, the tag no longer belongs to this asset.
    if (normaliseTag(asset.barcode) !== tagId) {
      await forgetTag(tagId);
      return { state: "unregistered" };
    }

    const lastFinished = tasks.items.find(
      (task) => task.status && FINISHED.has(task.status.toUpperCase())
    );

    return {
      state: "found",
      asset: {
        id: tagId,
        typeLabel:
          asset.assetTypes?.find((type) => !type.archived)?.name ??
          asset.categoryPath ??
          "Equipment",
        status: asset.status === "ARCHIVED" ? "Decommissioned" : "In service",
        manufacturer: asset.manufacturer,
        model: asset.modelNumber,
        serialNumber: asset.serialNumber,
        site: asset.client?.name ?? null,
        lastService: formatDate(lastFinished?.completionDate ?? null),
        history: tasks.items.map((task) => ({
          date: formatDate(task.completionDate ?? task.dueDate),
          title: task.name ?? "Job",
          reference: task.jobNumber ? `Job ${task.jobNumber}` : "",
        })),
        documents: await loadDocuments(tagId, entry.legacyAssetId),
      },
    };
  } catch (err) {
    if (err instanceof ArofloError && err.status === 404) {
      await forgetTag(tagId);
      return { state: "unregistered" };
    }
    console.error(`Asset lookup failed for ${tagId}:`, err);
    return { state: "unavailable" };
  }
}
