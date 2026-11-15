import { sql } from "drizzle-orm";
import { db } from "@/db";
import { arofloSyncState } from "@/db/schema";
import { isLegacyConfigured } from "@/lib/aroflo/legacy";
import { ASSET_LIST_FULL_KEY } from "@/lib/assets/assetList";
import { syncRegisterFromLegacy } from "@/lib/assets/legacyRegister";
import { getSyncState, setSyncState } from "@/lib/assets/tagIndex";

/**
 * When to bring the shared asset list up to date from AroFlo.
 *
 * There is no ten-minute timer: the list is topped up when a phone asks
 * for it and the copy is more than ten minutes old. That is one AroFlo
 * request (its "changed since" feed), and none at all while nobody is
 * asking.
 *
 * That feed is not complete, though. It has been seen to miss an older
 * asset that had just been given a barcode, and it doesn't count custom
 * field or location edits as changes. So the whole list is read again
 * (about seven requests) when the last full read is more than six hours
 * old, when someone pulls to refresh in the app, and by the daily cron.
 *
 * What a phone can ask for:
 *   "stale" — the ordinary read: top up if the copy is over ten minutes old.
 *   "fresh" — it has just edited an asset: top up now.
 *   "full"  — pull to refresh: read the whole list from AroFlo again.
 */

export type RefreshRequest = "stale" | "fresh" | "full";

export const STALE_AFTER_MS = 10 * 60 * 1000;
// Only stops two requests a moment apart both asking AroFlo.
export const FRESH_AFTER_MS = 5 * 1000;
// The copy is read again in full when the last full read is older than this.
export const FULL_AFTER_MS = 6 * 60 * 60 * 1000;
// A full read is about seven requests: two people pulling to refresh
// together share one.
export const FULL_REQUEST_AFTER_MS = 2 * 60 * 1000;
// The first full read takes several seconds; don't start a second alongside it.
const FIRST_READ_AFTER_MS = 60 * 1000;
// After a failed read, try again in a minute rather than on every request.
const RETRY_AFTER_MS = 60 * 1000;

// Separate turns, so a top-up a moment ago doesn't refuse a pull to refresh.
const TOP_UP_CLAIM_KEY = "asset_list_refresh_claim";
const FULL_CLAIM_KEY = "asset_list_full_claim";

/** What to read from AroFlo, and how long since the last such read started before another may. */
export function planRefresh(
  request: RefreshRequest,
  fullReadAt: Date | null,
  now: Date
): { mode: "full" | "changes"; minIntervalMs: number } {
  if (!fullReadAt) return { mode: "full", minIntervalMs: FIRST_READ_AFTER_MS };
  if (request === "full") return { mode: "full", minIntervalMs: FULL_REQUEST_AFTER_MS };
  const topUpInterval = request === "fresh" ? FRESH_AFTER_MS : STALE_AFTER_MS;
  if (now.getTime() - fullReadAt.getTime() > FULL_AFTER_MS) {
    return { mode: "full", minIntervalMs: topUpInterval };
  }
  return { mode: "changes", minIntervalMs: topUpInterval };
}

/**
 * Takes the turn to refresh, if nobody has taken it within `intervalMs`.
 * One statement, so two requests arriving together can't both win.
 */
export async function claimRefresh(key: string, intervalMs: number): Promise<boolean> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - intervalMs).toISOString();
  const won = await db
    .insert(arofloSyncState)
    .values({ key, value: now.toISOString() })
    .onConflictDoUpdate({
      target: arofloSyncState.key,
      set: { value: now.toISOString(), updatedAt: now },
      // ISO timestamps sort as text.
      setWhere: sql`${arofloSyncState.value} < ${cutoff}`,
    })
    .returning({ key: arofloSyncState.key });
  return won.length > 0;
}

/**
 * Brings the list up to date from AroFlo if it is due. Never throws: when
 * AroFlo can't be reached the copy already stored is served, and the
 * reply's `syncedAt` and `fullSyncedAt` say how old it is.
 */
export async function refreshAssetList(request: RefreshRequest): Promise<void> {
  if (!isLegacyConfigured()) return;
  try {
    const fullReadAt = await getSyncState(ASSET_LIST_FULL_KEY);
    const plan = planRefresh(request, fullReadAt ? new Date(fullReadAt) : null, new Date());
    const claimKey = plan.mode === "full" ? FULL_CLAIM_KEY : TOP_UP_CLAIM_KEY;
    if (!(await claimRefresh(claimKey, plan.minIntervalMs))) return;
    try {
      await syncRegisterFromLegacy(plan.mode);
    } catch (err) {
      console.error(`Asset list ${plan.mode} read from AroFlo failed:`, err);
      // Give the turn back early, so a request in a minute tries again.
      await setSyncState(
        claimKey,
        new Date(Date.now() - plan.minIntervalMs + RETRY_AFTER_MS).toISOString()
      );
    }
  } catch (err) {
    console.error("Asset list refresh check failed:", err);
  }
}
