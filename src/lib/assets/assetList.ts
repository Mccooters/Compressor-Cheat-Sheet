import { createHash } from "node:crypto";
import { and, asc, eq, gt, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { arofloAsset } from "@/db/schema";

/**
 * The shared AroFlo asset list.
 *
 * Every phone used to read the whole asset list (about 3,100 assets, seven
 * requests) from AroFlo itself, daily, plus a "what changed" check each
 * hour. That cost grows with every phone. Instead this site keeps one copy,
 * topped up from AroFlo's "changed since" feed, and the apps download it
 * from /api/assets. AroFlo is asked once, whoever is asking.
 *
 * Rows are stored and served exactly as AroFlo's older API sends them
 * (location and custom fields joined), so an app reads them with the same
 * code it uses for AroFlo's own reply.
 *
 * This file only stores and reads the copy. Fetching from AroFlo is in
 * legacyRegister.ts (one read feeds both the tag register and this list),
 * and deciding when to fetch is in assetListRefresh.ts.
 */

/** One asset as AroFlo's older API sends it. */
export type LegacyRow = Record<string, unknown>;

/** When the list was last read from AroFlo in full, and last topped up. */
export const ASSET_LIST_FULL_KEY = "asset_list_full_at";
export const ASSET_LIST_SYNCED_KEY = "asset_list_synced_at";

// Rows per insert: 4 parameters each, well inside Postgres's limit.
const STORE_BATCH = 250;
// A full read that returns far fewer assets than are stored is more likely
// a short page from AroFlo than a mass archiving, so it isn't trusted to
// remove anything.
const TRUSTED_FULL_READ_FRACTION = 0.8;

export const DEFAULT_PAGE = 500;
export const MAX_PAGE = 1000;

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
};

export function rowId(row: LegacyRow): string | null {
  return text(row.assetid);
}

export function isArchivedRow(row: LegacyRow): boolean {
  return String(row.archived).toLowerCase() === "true";
}

/** JSON with object keys in a fixed order, so the same row always hashes the same. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function rowHash(row: LegacyRow): string {
  return createHash("sha1").update(stableJson(row)).digest("hex");
}

/** One row per asset ID; where AroFlo sent an asset twice, the later row wins. */
export function uniqueRows(rows: LegacyRow[]): Map<string, LegacyRow> {
  const byId = new Map<string, LegacyRow>();
  for (const row of rows) {
    const id = rowId(row);
    if (id) byId.set(id, row);
  }
  return byId;
}

/** Whether a full read saw enough of the stored list to be trusted to remove what it didn't see. */
export function fullReadIsTrusted(seen: number, storedLive: number): boolean {
  return seen >= storedLive * TRUSTED_FULL_READ_FRACTION;
}

/**
 * Stores what a read of AroFlo returned. `full` is a read of every
 * non-archived asset: anything stored that it didn't return has been
 * archived or deleted. A "changes" read returns archived assets too, with
 * their own flag.
 *
 * An asset whose row is the same as last time is left untouched, so its
 * changedAt doesn't move and phones don't fetch it again.
 */
export async function storeAssetRows(
  rows: LegacyRow[],
  full: boolean
): Promise<{ seen: number; changed: number; removed: number }> {
  const byId = uniqueRows(rows);
  const entries = [...byId.entries()];
  let changed = 0;

  for (let i = 0; i < entries.length; i += STORE_BATCH) {
    const written = await db
      .insert(arofloAsset)
      .values(
        entries.slice(i, i + STORE_BATCH).map(([legacyAssetId, row]) => ({
          legacyAssetId,
          row,
          hash: rowHash(row),
          archived: isArchivedRow(row),
        }))
      )
      .onConflictDoUpdate({
        target: arofloAsset.legacyAssetId,
        set: {
          row: sql`excluded.row`,
          hash: sql`excluded.hash`,
          archived: sql`excluded.archived`,
          changedAt: sql`now()`,
        },
        setWhere: sql`${arofloAsset.hash} <> excluded.hash or ${arofloAsset.archived} <> excluded.archived`,
      })
      .returning({ id: arofloAsset.legacyAssetId });
    changed += written.length;
  }

  let removed = 0;
  if (full) {
    const [{ live }] = await db
      .select({ live: sql<number>`count(*)::int` })
      .from(arofloAsset)
      .where(eq(arofloAsset.archived, false));
    const seenIds = entries.map(([id]) => id);
    if (!fullReadIsTrusted(seenIds.length, live)) {
      console.warn(
        `Full asset read returned ${seenIds.length} assets but ${live} are stored; nothing was removed on the strength of it.`
      );
    } else if (seenIds.length > 0) {
      const gone = await db
        .update(arofloAsset)
        .set({ archived: true, changedAt: sql`now()` })
        .where(and(eq(arofloAsset.archived, false), notInArray(arofloAsset.legacyAssetId, seenIds)))
        .returning({ id: arofloAsset.legacyAssetId });
      removed = gone.length;
    }
  }

  return { seen: entries.length, changed, removed };
}

/**
 * One page of the list, ordered by asset ID. With `since`, only assets this
 * site saw change after then. `next` is the ID to pass as `after` for the
 * following page, or null on the last one.
 */
export async function listAssetPage(options: {
  since: Date | null;
  after: string | null;
  limit: number;
}): Promise<{ rows: LegacyRow[]; next: string | null }> {
  const limit = Math.min(Math.max(1, options.limit), MAX_PAGE);
  const found = await db
    .select({ id: arofloAsset.legacyAssetId, row: arofloAsset.row })
    .from(arofloAsset)
    .where(
      and(
        eq(arofloAsset.archived, false),
        options.since ? gt(arofloAsset.changedAt, options.since) : undefined,
        options.after ? gt(arofloAsset.legacyAssetId, options.after) : undefined
      )
    )
    .orderBy(asc(arofloAsset.legacyAssetId))
    // One more than asked for, to know whether there is another page.
    .limit(limit + 1);
  const page = found.slice(0, limit);
  return {
    rows: page.map((entry) => entry.row as LegacyRow),
    next: found.length > limit ? page[page.length - 1].id : null,
  };
}

/** IDs of assets archived or removed since a time, for a phone to drop from its copy. */
export async function removedAssetIds(since: Date): Promise<string[]> {
  const gone = await db
    .select({ id: arofloAsset.legacyAssetId })
    .from(arofloAsset)
    .where(and(eq(arofloAsset.archived, true), gt(arofloAsset.changedAt, since)))
    .orderBy(asc(arofloAsset.legacyAssetId));
  return gone.map((entry) => entry.id);
}
