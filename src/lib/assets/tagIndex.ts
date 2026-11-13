import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { arofloSyncState, assetTag } from "@/db/schema";
import { arofloGet } from "@/lib/aroflo/client";

/**
 * Tag → AroFlo asset index.
 *
 * AroFlo can return an asset by its own ID, but cannot search by barcode,
 * and its asset list doesn't include the barcode either. Reading every
 * asset to find one (≈3,100 of them against a 5,000-requests-a-day quota)
 * is not an option, so this keeps a small index instead and tops it up from
 * AroFlo's "assets changed since X" feed: a tag only starts to exist when
 * someone types it into an asset's Barcode field, which is a change.
 *
 * The top-up runs when an unknown tag is scanned, in small batches and at
 * most once every few minutes, so scanning an unregistered spare repeatedly
 * costs almost nothing.
 */

// AAC-{3-letter type}-{4 digits}, e.g. AAC-CMP-0001.
export const TAG_PATTERN = /^AAC-[A-Z]{3}-\d{4}$/;

// The first tags were printed on 12 Nov 2026, so nothing changed before
// then can carry one.
const FEED_START = "2026-11-11T00:00:00Z";
// One top-up reads at most this many assets (one AroFlo request each, plus
// one for the feed). Kept well under the 120-a-minute limit because the
// iOS app shares the quota, and because the person scanning is waiting.
const BATCH_SIZE = 40;
const CONCURRENCY = 4;
// How long to wait before topping up again: short while there is a backlog
// still to read, longer once the index has caught up.
const BACKLOG_INTERVAL_MS = 60 * 1000;
const IDLE_INTERVAL_MS = 5 * 60 * 1000;

const CURSOR_KEY = "asset_feed_cursor";
const CHECKED_KEY = "asset_feed_checked_at";
const BACKLOG_KEY = "asset_feed_backlog";

/** Barcodes are typed by hand in AroFlo: "AAC - CMP - 0001" must still match. */
export function normaliseTag(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tag = raw.replace(/\s+/g, "").toUpperCase();
  return TAG_PATTERN.test(tag) ? tag : null;
}

async function getState(key: string): Promise<string | null> {
  const row = await db.query.arofloSyncState.findFirst({
    where: eq(arofloSyncState.key, key),
  });
  return row?.value ?? null;
}

async function setState(key: string, value: string): Promise<void> {
  await db
    .insert(arofloSyncState)
    .values({ key, value })
    .onConflictDoUpdate({
      target: arofloSyncState.key,
      set: { value, updatedAt: new Date() },
    });
}

async function lookup(tagId: string): Promise<string | null> {
  const row = await db.query.assetTag.findFirst({
    where: eq(assetTag.tagId, tagId),
  });
  return row?.arofloAssetId ?? null;
}

/** Drops a mapping that AroFlo no longer agrees with (barcode edited or cleared). */
export async function forgetTag(tagId: string): Promise<void> {
  await db.delete(assetTag).where(eq(assetTag.tagId, tagId));
}

type FeedItem = { id: string; lastUpdated: string };

async function recordAsset(id: string): Promise<boolean> {
  const asset = await arofloGet<{ id: string; barcode: string | null }>(
    `/assets/${id}?_fields=id,barcode`
  );
  const tagId = normaliseTag(asset.barcode);

  // This asset may have carried a different tag before the edit.
  await db
    .delete(assetTag)
    .where(
      tagId
        ? and(eq(assetTag.arofloAssetId, id), ne(assetTag.tagId, tagId))
        : eq(assetTag.arofloAssetId, id)
    );
  if (!tagId) return false;

  await db
    .insert(assetTag)
    .values({ tagId, arofloAssetId: id })
    .onConflictDoUpdate({
      target: assetTag.tagId,
      set: { arofloAssetId: id, updatedAt: new Date() },
    });
  return true;
}

/**
 * Reads the next batch of assets changed since the cursor and records any
 * that carry a tag. Resumable: the cursor moves forward after every group
 * that is fully recorded, so a rate limit or a crash part-way through loses
 * nothing and the next run carries on from there.
 */
export async function refreshTagIndex(): Promise<{ checked: number; tagged: number }> {
  const since = (await getState(CURSOR_KEY)) ?? FEED_START;
  // Stamp first, so concurrent scans don't all start a refresh.
  await setState(CHECKED_KEY, new Date().toISOString());

  const feed = await arofloGet<{ items: FeedItem[] }>(
    `/lastupdated/ASSETS?since=${encodeURIComponent(since)}&order=ASC&limit=${BATCH_SIZE}`
  );
  const changed = feed.items;
  const full = changed.length === BATCH_SIZE;

  let checked = 0;
  let tagged = 0;
  let interrupted = false;

  for (let i = 0; i < changed.length; i += CONCURRENCY) {
    const group = changed.slice(i, i + CONCURRENCY);
    try {
      const results = await Promise.all(group.map(({ id }) => recordAsset(id)));
      tagged += results.filter(Boolean).length;
    } catch (err) {
      // Most likely the rate limit. Keep what is recorded and stop.
      console.error("Tag index refresh stopped early:", err);
      interrupted = true;
      break;
    }
    checked += group.length;

    // Oldest-first order means everything up to here is done. When more
    // remains, step back 1 ms: the feed returns changes strictly after the
    // cursor, and re-reading one asset is cheaper than skipping another
    // that shares its timestamp.
    const last = Date.parse(group[group.length - 1].lastUpdated);
    const moreToCome = full || i + CONCURRENCY < changed.length;
    await setState(CURSOR_KEY, new Date(moreToCome ? last - 1 : last).toISOString());
  }

  await setState(BACKLOG_KEY, full || interrupted ? "1" : "0");
  return { checked, tagged };
}

/** The AroFlo asset ID carrying this tag, or null if no asset has it yet. */
export async function findArofloAssetId(tagId: string): Promise<string | null> {
  const known = await lookup(tagId);
  if (known) return known;

  const checkedAt = await getState(CHECKED_KEY);
  const backlog = (await getState(BACKLOG_KEY)) === "1";
  const interval = backlog ? BACKLOG_INTERVAL_MS : IDLE_INTERVAL_MS;
  if (checkedAt && Date.now() - Date.parse(checkedAt) < interval) {
    return null;
  }

  await refreshTagIndex();
  return lookup(tagId);
}
