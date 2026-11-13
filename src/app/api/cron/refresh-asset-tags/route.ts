import { timingSafeEqual } from "node:crypto";
import { isArofloConfigured } from "@/lib/aroflo/client";
import { hasBacklog, refreshTagIndex } from "@/lib/assets/tagIndex";

/**
 * Scheduled top-up of the asset-tag register (see vercel.json). Vercel calls
 * this with `Authorization: Bearer <CRON_SECRET>`.
 *
 * Scans of unknown tags also top the register up, so this only has to keep
 * it reasonably fresh for apps that work from an offline copy.
 */
export const dynamic = "force-dynamic";

// Each batch is up to 41 AroFlo requests; two keeps a run well inside
// AroFlo's 120-a-minute limit, which the iOS app shares.
const MAX_BATCHES = 2;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isArofloConfigured()) {
    return Response.json({ error: "AROFLO_API_TOKEN is not set" }, { status: 503 });
  }

  try {
    let checked = 0;
    let tagged = 0;
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const result = await refreshTagIndex();
      checked += result.checked;
      tagged += result.tagged;
      if (!(await hasBacklog())) break;
    }
    return Response.json({ checked, tagged, backlog: await hasBacklog() });
  } catch (err) {
    console.error("Scheduled asset-tag refresh failed:", err);
    return Response.json({ error: "Refresh failed" }, { status: 500 });
  }
}
