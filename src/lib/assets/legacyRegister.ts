import { and, eq, isNotNull, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { assetTag } from "@/db/schema";
import { arofloGet, arofloPost, isArofloConfigured } from "@/lib/aroflo/client";
import { legacyGet } from "@/lib/aroflo/legacy";
import {
  ASSET_LIST_FULL_KEY,
  ASSET_LIST_SYNCED_KEY,
  storeAssetRows,
} from "@/lib/assets/assetList";
import {
  crossCheckAssetList,
  fillMissingV2Ids,
  startCrossCheckFrom,
  type FeedItem,
} from "@/lib/assets/assetListCrossCheck";
import { getSyncState, normaliseTag, setSyncState } from "@/lib/assets/tagIndex";

/**
 * Builds the asset-tag register from AroFlo's older API, whose asset list
 * includes each asset's barcode (the v2 list does not).
 *
 *   "full"    — every asset, ~8 pages of 500 (archived ones come back too
 *               and are skipped). Replaces the register, so tags whose
 *               barcode was cleared disappear.
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

// AroFlo's filter names, checked against the live API on 15 Nov 2026. They
// are the names the rows themselves carry, "lastupdateD…": the earlier
// spelling without that "d" is not a field, and AroFlo silently ignores a
// filter on a field it doesn't know. An ignored filter doesn't fail: it
// returns the wrong assets (with no join, only those made in the last 30
// days; with a join, every asset), which is why the "changed since" read
// used to miss an older asset that had just been given a barcode, and why
// the hourly top-up was reading the whole list.
//
// `archived` can't be filtered on for assets (true and false return the
// same rows), so archived assets come back and are dropped here by their
// own flag.
//
// Every asset: a filter on a real field that is true for all of them.
// (Some filter has to be sent, or AroFlo returns only recently made
// assets.) Not "last updated after 2000": 57 assets have never been
// updated and have no such date, and that filter left them out, which had
// the full read drop 49 current assets from the shared list on 15 Nov.
// This one returned all 3,752, those 57 included.
const EVERY_ASSET_FILTER = "and|assetname|!=|__none__";
const changedSinceFilter = (since: Date) =>
  `and|lastupdateddatetimeutc|>|${legacyTimestamp(since)}`;

// The shared asset list needs each asset's custom field values, which AroFlo
// only sends when asked to join them (the `customfields` key is there either
// way, but empty). One comma-separated `join` parameter and two parameters
// both work. If AroFlo refuses the joined read, the plain read the register
// has always used is made instead: the register carries on, and the asset
// list waits.
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

/**
 * After the asset list is stored: ask API v2's feed what changed, and read
 * again any asset the read above didn't bring (see assetListCrossCheck.ts).
 * Never throws: the register and the list are already stored, and whatever
 * this misses is picked up by the next check or the next full read.
 */
async function crossCheckWithV2(
  rows: LegacyAssetRow[],
  full: boolean,
  startedAt: Date
): Promise<void> {
  if (!isArofloConfigured()) return;
  try {
    // New rows need their v2 IDs before the feed's IDs can be matched to them.
    const filled = await fillMissingV2Ids(toV2Ids);
    if (full) {
      // Everything was just read: only changes from now on need checking.
      await startCrossCheckFrom(startedAt);
      if (filled > 0) console.log(`Asset list: ${filled} API v2 IDs filled in.`);
      return;
    }
    const justRead = new Set(rows.map((row) => text(row.assetid)).filter((id) => id !== null));
    const result = await crossCheckAssetList({
      justRead,
      startFrom: startedAt.toISOString(),
      readFeed: async (since, limit) =>
        (
          await arofloGet<{ items: FeedItem[] }>(
            `/lastupdated/ASSETS?since=${encodeURIComponent(since)}&order=ASC&limit=${limit}`
          )
        ).items,
      readAsset: async (legacyId) => {
        await new Promise((resolve) => setTimeout(resolve, PAGE_GAP_MS));
        const found = await fetchPage([`and|assetid|=|${legacyId}`], JOINED, 1);
        return found.find((row) => text(row.assetid) === legacyId) ?? null;
      },
    });
    console.log(
      `Asset list v2 cross-check: ${result.changed} changed in v2, ${result.alreadyRead} already read, ${result.reread} read again, ${result.notInList} not in the list yet${filled > 0 ? `; ${filled} API v2 IDs filled in` : ""}.`
    );
  } catch (err) {
    console.error("Asset list v2 cross-check failed:", err);
  }
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
        [EVERY_ASSET_FILTER]
      : [changedSinceFilter(new Date(Date.parse(lastSync) - OVERLAP_MS))]
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
    await crossCheckWithV2(rows, full, startedAt);
  }
  return {
    checked: rows.length,
    tagged: tagged.size,
    assetsChanged: stored.changed,
    assetsRemoved: stored.removed,
  };
}
