import { and, eq, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { assetTag } from "@/db/schema";
import { arofloPost } from "@/lib/aroflo/client";
import { legacyGet } from "@/lib/aroflo/legacy";
import { getSyncState, normaliseTag, setSyncState } from "@/lib/assets/tagIndex";

/**
 * Builds the asset-tag register from AroFlo's older API, whose asset list
 * includes each asset's barcode (the v2 list does not).
 *
 *   "full"    — every non-archived asset, ~7 pages of 500. Replaces the
 *               register, so tags whose barcode was cleared disappear.
 *   "changes" — only assets changed since the last sync, usually one page.
 *
 * The register stores AroFlo v2 IDs, so the legacy IDs of tagged assets are
 * converted with one v2 request per 100.
 */

const PAGE_SIZE = 500; // AroFlo's maximum
const MAX_PAGES = 20;
const PAGE_GAP_MS = 360; // same pacing as the iOS app
// Re-read a little before the last sync to cover clock differences.
const OVERLAP_MS = 10 * 60 * 1000;
const CURSOR_KEY = "legacy_register_synced_at";

type LegacyAssetRow = {
  assetid?: string;
  assetname?: string;
  serialnumber?: string | number;
  barcode?: string | number;
  archived?: string | boolean;
  client?: { clientname?: string } | null;
};

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
};

/** AroFlo wants UTC as "yyyy-MM-dd HH:mm:ss". */
function legacyTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function fetchRows(where: string[]): Promise<LegacyAssetRow[]> {
  const rows: LegacyAssetRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await legacyGet<{ assets?: LegacyAssetRow[] }>({
      zone: "assets",
      where,
      page,
      pageSize: PAGE_SIZE,
    });
    const batch = Array.isArray(response.assets) ? response.assets : [];
    rows.push(...batch);
    // A short page is the last one.
    if (batch.length < PAGE_SIZE) break;
    await new Promise((resolve) => setTimeout(resolve, PAGE_GAP_MS));
  }
  return rows;
}

async function toV2Ids(legacyIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < legacyIds.length; i += 100) {
    const result = await arofloPost<{ items: { id: string; legacyId: string }[] }>(
      "/idconversions",
      { ids: legacyIds.slice(i, i + 100) }
    );
    for (const item of result.items) map.set(item.legacyId, item.id);
  }
  return map;
}

export async function syncRegisterFromLegacy(
  mode: "full" | "changes"
): Promise<{ checked: number; tagged: number }> {
  const startedAt = new Date();
  const lastSync = await getSyncState(CURSOR_KEY);
  // Without a previous sync there is nothing to diff against.
  const full = mode === "full" || !lastSync;

  const rows = await fetchRows(
    full
      ? // AroFlo only returns the last 30 days' assets when no filter is sent.
        ["and|lastupdateutc|>|2000-01-01", "and|archived|=|false"]
      : [
          `and|lastupdatedatetimeutc|>|${legacyTimestamp(
            new Date(Date.parse(lastSync) - OVERLAP_MS)
          )}`,
        ]
  );

  // A full read that comes back empty is a fault, not an empty company.
  // Stop here rather than wipe the register on the strength of it.
  if (full && rows.length === 0) {
    throw new Error("AroFlo returned no assets for a full read; register left unchanged.");
  }

  // tag -> row. If two assets carry the same tag, the later row wins.
  const tagged = new Map<string, LegacyAssetRow & { assetid: string }>();
  const untaggedIds: string[] = [];
  for (const row of rows) {
    const legacyId = text(row.assetid);
    if (!legacyId) continue;
    const tagId = String(row.archived) === "true" ? null : normaliseTag(text(row.barcode));
    if (!tagId) {
      untaggedIds.push(legacyId);
      continue;
    }
    const clash = tagged.get(tagId);
    if (clash && clash.assetid !== legacyId) {
      console.warn(`Asset tag ${tagId} is on two AroFlo assets (${clash.assetid} and ${legacyId}).`);
    }
    tagged.set(tagId, { ...row, assetid: legacyId });
  }

  const v2Ids = await toV2Ids([...tagged.values()].map((row) => row.assetid));

  for (const [tagId, row] of tagged) {
    const arofloAssetId = v2Ids.get(row.assetid);
    if (!arofloAssetId) continue;
    const details = {
      arofloAssetId,
      legacyAssetId: row.assetid,
      name: text(row.assetname),
      serialNumber: text(row.serialnumber),
      clientName: text(row.client?.clientname),
    };
    // This asset may have carried a different tag before.
    await db
      .delete(assetTag)
      .where(and(eq(assetTag.arofloAssetId, arofloAssetId), ne(assetTag.tagId, tagId)));
    await db
      .insert(assetTag)
      .values({ tagId, ...details })
      .onConflictDoUpdate({
        target: assetTag.tagId,
        set: { ...details, updatedAt: new Date() },
      });
  }

  if (full) {
    // Anything not seen in a full read no longer carries a tag.
    const keep = [...tagged.keys()];
    await db
      .delete(assetTag)
      .where(keep.length > 0 ? notInArray(assetTag.tagId, keep) : undefined);
  } else {
    // Changed assets that now have no tag (cleared barcode, or archived).
    for (const legacyId of untaggedIds) {
      await db.delete(assetTag).where(eq(assetTag.legacyAssetId, legacyId));
    }
  }

  await setSyncState(CURSOR_KEY, startedAt.toISOString());
  return { checked: rows.length, tagged: tagged.size };
}
