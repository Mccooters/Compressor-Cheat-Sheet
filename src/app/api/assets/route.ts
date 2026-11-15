import {
  ASSET_LIST_FULL_KEY,
  ASSET_LIST_SYNCED_KEY,
  DEFAULT_PAGE,
  listAssetPage,
  removedAssetIds,
} from "@/lib/assets/assetList";
import { refreshAssetList, type RefreshRequest } from "@/lib/assets/assetListRefresh";
import { getSyncState } from "@/lib/assets/tagIndex";
import { checkMobileToken, mobileJson } from "@/lib/mobile/auth";

/**
 * The shared AroFlo asset list: every current asset, as AroFlo's older API
 * sends it, so the apps download one copy from here instead of each phone
 * reading the list from AroFlo. Contract in docs/mobile-api.md.
 *
 * The first page of a request tops the copy up from AroFlo when it is more
 * than ten minutes old; at once with `fresh=1`, for a phone that has just
 * edited an asset; and from the whole list again with `fresh=full`, for a
 * pull to refresh. See assetListRefresh.ts.
 */
export const dynamic = "force-dynamic";
// Reading the whole list from AroFlo takes several seconds.
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = checkMobileToken(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const sinceText = params.get("since");
  const since = sinceText ? new Date(sinceText) : null;
  if (since && Number.isNaN(since.getTime())) {
    return mobileJson({ error: "since is not a date" }, 400);
  }
  const after = params.get("after") || null;
  const limit = Number.parseInt(params.get("limit") ?? "", 10) || DEFAULT_PAGE;
  const fresh = params.get("fresh");
  const refresh: RefreshRequest = fresh === "full" ? "full" : fresh === "1" ? "fresh" : "stale";

  try {
    // Later pages belong to the same read; only the first one looks at AroFlo.
    if (!after) await refreshAssetList(refresh);

    // Until AroFlo has been read in full once there is no list to give, and
    // an empty one would have a phone throw its own copy away.
    if ((await getSyncState(ASSET_LIST_FULL_KEY)) === null) {
      return mobileJson({ error: "The asset list hasn't been read from AroFlo yet." }, 503);
    }

    // Taken before reading, so a change landing mid-request is asked for again next time.
    const generatedAt = new Date();
    const page = await listAssetPage({ since, after, limit });
    const removed = !after && since ? await removedAssetIds(since) : [];
    return mobileJson({
      generatedAt: generatedAt.toISOString(),
      syncedAt: await getSyncState(ASSET_LIST_SYNCED_KEY),
      fullSyncedAt: await getSyncState(ASSET_LIST_FULL_KEY),
      assets: page.rows,
      removed,
      next: page.next,
    });
  } catch (err) {
    console.error("Failed to list assets:", err);
    return mobileJson({ error: "Failed to list assets" }, 500);
  }
}
