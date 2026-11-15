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
 * There is no timer: the list is topped up when a phone asks for it and
 * the copy is more than an hour old. That is one AroFlo request (its
 * "changed since" feed, which returns the changed assets' whole rows), and
 * none at all while nobody is asking. A phone that wants it sooner asks:
 * "fresh" after an edit, "full" for a pull to refresh.
 *
 * With the right filter names (see legacyRegister.ts) that feed reported
 * the same assets as API v2's, which cross-checks it after every top-up.
 * What no "changed" feed can report is an asset deleted outright, and any
 * edit AroFlo doesn't stamp, so the whole list is still read again (about
 * eight requests) once a day by the cron, and when someone pulls to refresh
 * in the app.
 *
 * A full read takes about two minutes (AroFlo is slow to send pages with
 * custom fields joined), so a phone is only made to wait for one when it
 * asked for it. If the daily cron has missed (the last full read is over
 * 26 hours old), the next phone's ordinary read starts one after it has
 * its answer.
 *
 * What a phone can ask for:
 *   "stale" — the ordinary read: top up if the copy is over an hour old.
 *   "fresh" — it has just edited an asset: top up now.
 *   "full"  — pull to refresh: read the whole list from AroFlo again, and wait for it.
 */

export type RefreshRequest = "stale" | "fresh" | "full";

/** One read of AroFlo, and how long since the last such read started before another may. */
export type RefreshStep = { mode: "full" | "changes"; minIntervalMs: number };

// The owner's choice (15 Nov 2026): hourly is often enough on its own,
// since a phone can ask for a fresh copy whenever it needs one.
export const STALE_AFTER_MS = 60 * 60 * 1000;
// Only stops two requests a moment apart both asking AroFlo.
export const FRESH_AFTER_MS = 5 * 1000;
// The owner's choice (15 Nov 2026): the whole list once a day. The cron does
// that; this is only for a day the cron missed, hence the two hours' slack
// so the two don't both run at cron time.
export const FULL_AFTER_MS = 26 * 60 * 60 * 1000;
// Longer than a full read takes, so two never run side by side: someone
// pulling to refresh while one is running gets the copy as it stands.
export const FULL_READ_GAP_MS = 4 * 60 * 1000;
// After a failed read, try again in a minute rather than on every request.
const RETRY_AFTER_MS = 60 * 1000;
// While AroFlo won't give the joined rows the list is built from, a full
// read is about eight wasted requests: don't repeat it for every phone.
const UNAVAILABLE_RETRY_AFTER_MS = 30 * 60 * 1000;

// Separate turns, so a top-up a moment ago doesn't refuse a full read.
const TOP_UP_CLAIM_KEY = "asset_list_refresh_claim";
const FULL_CLAIM_KEY = "asset_list_full_claim";

/**
 * What to read from AroFlo before answering (`before`), and what to read
 * once the answer has gone (`after`).
 */
export function planRefresh(
  request: RefreshRequest,
  fullReadAt: Date | null,
  now: Date
): { before: RefreshStep | null; after: RefreshStep | null } {
  const fullRead: RefreshStep = { mode: "full", minIntervalMs: FULL_READ_GAP_MS };
  // Never read in full: there is nothing to give yet. Start the read, and
  // answer "not ready" rather than hold the phone for two minutes.
  if (!fullReadAt) return { before: null, after: fullRead };
  // Pull to refresh: the phone wants the result, so it waits.
  if (request === "full") return { before: fullRead, after: null };
  const topUp: RefreshStep = {
    mode: "changes",
    minIntervalMs: request === "fresh" ? FRESH_AFTER_MS : STALE_AFTER_MS,
  };
  const overdue = now.getTime() - fullReadAt.getTime() > FULL_AFTER_MS;
  return { before: topUp, after: overdue ? fullRead : null };
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

/** Runs one read if its turn is free. Never throws. */
async function runStep(step: RefreshStep): Promise<void> {
  const claimKey = step.mode === "full" ? FULL_CLAIM_KEY : TOP_UP_CLAIM_KEY;
  try {
    if (!(await claimRefresh(claimKey, step.minIntervalMs))) return;
    const retryIn = async (ms: number) =>
      setSyncState(claimKey, new Date(Date.now() - step.minIntervalMs + ms).toISOString());
    try {
      await syncRegisterFromLegacy(step.mode);
      if (step.mode === "full" && (await getSyncState(ASSET_LIST_FULL_KEY)) === null) {
        // The read worked but not with joins, so there is still no list.
        await retryIn(UNAVAILABLE_RETRY_AFTER_MS);
      }
    } catch (err) {
      console.error(`Asset list ${step.mode} read from AroFlo failed:`, err);
      // Give the turn back early, so a request in a minute tries again.
      await retryIn(RETRY_AFTER_MS);
    }
  } catch (err) {
    console.error("Asset list refresh failed:", err);
  }
}

/**
 * Brings the list up to date from AroFlo as far as this request should
 * wait for, and returns any further read to run once the answer has gone
 * (pass it to `after`). Never throws: when AroFlo can't be reached the copy
 * already stored is served, and the reply's `syncedAt` and `fullSyncedAt`
 * say how old it is.
 */
export async function refreshAssetList(
  request: RefreshRequest
): Promise<(() => Promise<void>) | null> {
  if (!isLegacyConfigured()) return null;
  try {
    const fullReadAt = await getSyncState(ASSET_LIST_FULL_KEY);
    const plan = planRefresh(request, fullReadAt ? new Date(fullReadAt) : null, new Date());
    if (plan.before) await runStep(plan.before);
    const later = plan.after;
    return later ? () => runStep(later) : null;
  } catch (err) {
    console.error("Asset list refresh check failed:", err);
    return null;
  }
}
