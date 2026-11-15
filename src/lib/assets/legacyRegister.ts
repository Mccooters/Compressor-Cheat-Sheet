import { and, eq, isNotNull, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { assetTag } from "@/db/schema";
import { arofloPost } from "@/lib/aroflo/client";
import { legacyGet } from "@/lib/aroflo/legacy";
import {
  ASSET_LIST_FULL_KEY,
  ASSET_LIST_SYNCED_KEY,
  storeAssetRows,
} from "@/lib/assets/assetList";
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
 *
 * The same read also keeps the shared asset list (assetList.ts): every row
 * is stored as AroFlo sent it, with the location and custom fields the apps
 * show, so the phones don't each read the list from AroFlo themselves.
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

// The shared asset list needs each asset's location and custom fields, which
// AroFlo only sends when asked to join them. Sent as two `join` parameters
// (as the iOS app does), AroFlo refused this site's request ("Signatures do
// not match") on the first live run, which also stopped the tag register's
// read. So the joined read is tried as one comma-separated parameter, and if
// AroFlo refuses that too, the plain read the register has always used is
// made instead: the register carries on, and the asset list waits.
const JOINED: string[] = ["location,customfields"];

async function fetchPage(
  where: string[],
  join: string[] | undefined,
  page: number
): Promise<LegacyAssetRow[]> {
  const response = await legacyGet<{ assets?: LegacyAssetRow[] }>({
    zone: "assets",
    where,
    ...(join ? { join } : {}),
    page,
    pageSize: PAGE_SIZE,
  });
  return Array.isArray(response.assets) ? response.assets : [];
}

/** Whether rows came back with what was joined (AroFlo ignores a join it doesn't know). */
export function rowsAreJoined(rows: Record<string, unknown>[]): boolean {
  return rows.some((row) => "customfields" in row || "location" in row);
}

/**
 * Every page of a read. `joined` says whether the rows carry location and
 * custom fields, i.e. whether they are complete enough for the shared asset
 * list. An empty joined read counts as joined: there is nothing to be missing.
 */
export async function fetchRows(
  where: string[]
): Promise<{ rows: LegacyAssetRow[]; joined: boolean }> {
  let join: string[] | undefined = JOINED;
  let first: LegacyAssetRow[];
  try {
    first = await fetchPage(where, join, 1);
    if (first.length > 0 && !rowsAreJoined(first)) {
      console.warn("AroFlo ignored the location and custom field joins; the shared asset list was not updated.");
      join = undefined;
    }
  } catch (err) {
    console.warn("AroFlo refused the joined asset read; reading without joins for the tag register only:", err);
    join = undefined;
    await new Promise((resolve) => setTimeout(resolve, PAGE_GAP_MS));
    first = await fetchPage(where, undefined, 1);
  }

  const rows = [...first];
  let last = first;
  for (let page = 2; page <= MAX_PAGES && last.length >= PAGE_SIZE; page++) {
    await new Promise((resolve) => setTimeout(resolve, PAGE_GAP_MS));
    // A short page is the last one.
    last = await fetchPage(where, join, page);
    rows.push(...last);
  }
  return { rows, joined: join !== undefined };
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
): Promise<{ checked: number; tagged: number; assetsChanged: number; assetsRemoved: number }> {
  const startedAt = new Date();
  const lastSync = await getSyncState(CURSOR_KEY);
  // Without a previous sync there is nothing to diff against.
  const full = mode === "full" || !lastSync;

  const { rows, joined } = await fetchRows(
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

  // The shared asset list first: if it can't be stored, the cursor below
  // isn't moved, and the next sync reads these rows again. Rows that came
  // without their joins aren't stored: phones would be sent assets with no
  // location or custom fields.
  const stored = joined ? await storeAssetRows(rows, full) : { changed: 0, removed: 0 };

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
    // A tag this API put in the register, but no longer reports, is gone.
    // Rows found through the v2 feed alone (no legacy ID) are left for that
    // feed to manage: this API has been seen to miss assets.
    const keep = [...tagged.keys()];
    await db
      .delete(assetTag)
      .where(
        keep.length > 0
          ? and(isNotNull(assetTag.legacyAssetId), notInArray(assetTag.tagId, keep))
          : isNotNull(assetTag.legacyAssetId)
      );
  } else {
    // Changed assets that now have no tag (cleared barcode, or archived).
    for (const legacyId of untaggedIds) {
      await db.delete(assetTag).where(eq(assetTag.legacyAssetId, legacyId));
    }
  }

  console.log(
    `Legacy AroFlo register sync (${full ? "full" : "changes"}, ${joined ? "with" : "WITHOUT"} location and custom fields): ${rows.length} assets read, ${tagged.size} tagged.`
  );
  await setSyncState(CURSOR_KEY, startedAt.toISOString());
  if (joined) {
    if (full) await setSyncState(ASSET_LIST_FULL_KEY, startedAt.toISOString());
    await setSyncState(ASSET_LIST_SYNCED_KEY, startedAt.toISOString());
  }
  return {
    checked: rows.length,
    tagged: tagged.size,
    assetsChanged: stored.changed,
    assetsRemoved: stored.removed,
  };
}
