import {
  assetIdsWithoutV2Id,
  legacyIdsForV2Ids,
  setV2Ids,
  storeAssetRows,
  type LegacyRow,
} from "@/lib/assets/assetList";
import { getSyncState, setSyncState } from "@/lib/assets/tagIndex";

/**
 * Catching the edits the older API's "changed since" feed misses.
 *
 * The shared asset list is topped up from the older API's feed, because it
 * returns the changed assets' whole rows in one request. But that feed has
 * been seen to miss an edit (a barcode added to an older asset). API v2 has
 * its own feed of changed assets, which did report it, though it only names
 * the assets, by their v2 IDs.
 *
 * So after each top-up, v2's feed is asked what changed, and any asset it
 * names that the top-up didn't bring is read again on its own through the
 * older API. Normally that is one extra request and nothing to re-read.
 *
 * AroFlo is reached through functions handed in, so this can be tested
 * without it and so this file needn't import the code that calls it.
 */

/** One entry of API v2's feed: an asset's v2 ID and when it last changed. */
export type FeedItem = { id: string; lastUpdated: string };

/** How far through v2's feed the asset list has been checked. */
export const ASSET_LIST_V2_CURSOR_KEY = "asset_list_v2_cursor";

// One request to the feed returns up to this many changed assets (the size
// the tag register already uses with it).
export const FEED_BATCH = 40;
// Feed requests per check, so a busy hour is still caught up within it.
const MAX_FEED_BATCHES = 3;
// Assets re-read per check, one request each. More than this is unusual
// enough to leave the rest for the next check (and the next full read).
export const MAX_REREADS = 20;
// v2 IDs looked up per check: ten requests of 100. A newly filled list is
// worked through over a few checks rather than in one burst.
const MAX_ID_LOOKUPS = 1000;

export type CrossCheckPlan = {
  /** Assets to read again, oldest change first: [older-API ID, v2 change time]. */
  reread: { legacyId: string; lastUpdated: string }[];
  /** Named by the feed, and the top-up had already brought them. */
  alreadyRead: number;
  /** Named by the feed, but not in the list (or their v2 ID isn't known yet). */
  notInList: number;
  /** Where the feed has been dealt with up to, or null if nothing was. */
  cursor: string | null;
  /** Whether the feed has more to give after `cursor`. */
  more: boolean;
};

/**
 * Decides what to read again from one batch of the feed (oldest first).
 * Stops at `maxRereads`: the cursor then stays before the first asset left
 * out, so the next check starts with it.
 */
export function planCrossCheck(
  feed: FeedItem[],
  legacyIdByV2Id: Map<string, string>,
  justRead: Set<string>,
  maxRereads: number,
  feedWasFull: boolean
): CrossCheckPlan {
  const plan: CrossCheckPlan = { reread: [], alreadyRead: 0, notInList: 0, cursor: null, more: feedWasFull };
  for (const item of feed) {
    const legacyId = legacyIdByV2Id.get(item.id);
    if (!legacyId) {
      plan.notInList += 1;
    } else if (justRead.has(legacyId)) {
      plan.alreadyRead += 1;
    } else if (plan.reread.some((entry) => entry.legacyId === legacyId)) {
      // The same asset twice in one batch: one read covers both.
    } else if (plan.reread.length >= maxRereads) {
      plan.more = true;
      return plan;
    } else {
      plan.reread.push({ legacyId, lastUpdated: item.lastUpdated });
    }
    plan.cursor = item.lastUpdated;
  }
  return plan;
}

/**
 * The feed returns changes strictly after the cursor. While more remain,
 * step back 1 ms: reading one asset twice is cheaper than skipping another
 * that shares its timestamp.
 */
export function nextCursor(cursor: string, more: boolean): string {
  return new Date(Date.parse(cursor) - (more ? 1 : 0)).toISOString();
}

export type CrossCheckResult = { changed: number; alreadyRead: number; reread: number; notInList: number };

/**
 * One check. `justRead` holds the older-API IDs the top-up just brought;
 * `readFeed` asks v2 for assets changed since a time; `readAsset` reads one
 * asset's row through the older API (null if it is gone).
 */
export async function crossCheckAssetList(options: {
  justRead: Set<string>;
  startFrom: string;
  readFeed: (since: string, limit: number) => Promise<FeedItem[]>;
  readAsset: (legacyId: string) => Promise<LegacyRow | null>;
}): Promise<CrossCheckResult> {
  const result: CrossCheckResult = { changed: 0, alreadyRead: 0, reread: 0, notInList: 0 };
  let since = (await getSyncState(ASSET_LIST_V2_CURSOR_KEY)) ?? options.startFrom;
  let rereadsLeft = MAX_REREADS;

  for (let batch = 0; batch < MAX_FEED_BATCHES; batch++) {
    const feed = await options.readFeed(since, FEED_BATCH);
    if (feed.length === 0) break;
    const known = await legacyIdsForV2Ids([...new Set(feed.map((item) => item.id))]);
    const plan = planCrossCheck(feed, known, options.justRead, rereadsLeft, feed.length === FEED_BATCH);

    for (const entry of plan.reread) {
      const row = await options.readAsset(entry.legacyId);
      if (row) await storeAssetRows([row], false);
      result.reread += 1;
      rereadsLeft -= 1;
    }
    result.changed += plan.alreadyRead + plan.notInList + plan.reread.length;
    result.alreadyRead += plan.alreadyRead;
    result.notInList += plan.notInList;

    // Only once the batch's re-reads are stored, so a failure part-way
    // leaves the cursor where it was and the next check does them again.
    if (plan.cursor) {
      since = nextCursor(plan.cursor, plan.more);
      await setSyncState(ASSET_LIST_V2_CURSOR_KEY, since);
    }
    if (!plan.more || rereadsLeft <= 0) break;
  }
  return result;
}

/** After a full read nothing earlier needs checking: start the feed from then. */
export async function startCrossCheckFrom(time: Date): Promise<void> {
  await setSyncState(ASSET_LIST_V2_CURSOR_KEY, time.toISOString());
}

/**
 * Looks up the v2 IDs of assets that don't have one yet. `convert` turns
 * older-API IDs into v2 IDs (older-API ID -> v2 ID). Returns how many were
 * filled in.
 */
export async function fillMissingV2Ids(
  convert: (legacyIds: string[]) => Promise<Map<string, string>>
): Promise<number> {
  const missing = await assetIdsWithoutV2Id(MAX_ID_LOOKUPS);
  if (missing.length === 0) return 0;
  const found = await convert(missing);
  await setV2Ids(found);
  return found.size;
}
