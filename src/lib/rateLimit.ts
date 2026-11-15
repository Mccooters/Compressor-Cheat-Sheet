import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimit } from "@/db/schema";

// Limits how fast one visitor can open the public asset pages.
//
// The sticker numbers run in order (AAC-CMP-0001, -0002, ...), so without a
// limit anyone could step through them and collect every tagged asset's
// details and service documents. A customer or a tech scanning stickers
// opens a handful; a script walking the numbers opens hundreds.
//
// Counted in the database (one small upsert per view) because the site runs
// as short-lived serverless functions with no memory shared between them.

export type Limit = { max: number; windowMs: number };

/** Asset pages one visitor may open: far more than anyone scanning stickers needs. */
export const ASSET_PAGE_LIMIT: Limit = { max: 30, windowMs: 10 * 60_000 };
/** Documents one visitor may open from those pages. */
export const ASSET_DOCUMENT_LIMIT: Limit = { max: 30, windowMs: 10 * 60_000 };

/**
 * The visitor's address as the hosting platform reports it. Vercel sets
 * x-real-ip (and overwrites x-forwarded-for) itself, so a visitor can't
 * choose their own.
 */
export function clientAddress(headers: Headers): string {
  return (
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** A key for a visitor within a scope. Hashed with the site's secret: the address itself is never stored. */
export function visitorKey(scope: string, headers: Headers): string {
  const digest = createHash("sha256")
    .update(`${process.env.AUTH_SECRET ?? ""}:${clientAddress(headers)}`)
    .digest("hex")
    .slice(0, 32);
  return `${scope}:${digest}`;
}

/**
 * Counts one request against `key` and says whether it is within the limit.
 * A window starts at the first request and lasts `windowMs`; the next
 * request after that starts a new one.
 *
 * If the database doesn't answer, the request is allowed: the limit is a
 * guard against bulk reading, and failing shut would take the public pages
 * down with it.
 */
export async function withinLimit(key: string, limit: Limit): Promise<boolean> {
  try {
    const seconds = Math.ceil(limit.windowMs / 1000);
    const expired = sql`${rateLimit.windowStart} < now() - make_interval(secs => ${seconds})`;
    const [row] = await db
      .insert(rateLimit)
      .values({ key })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: {
          count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
          windowStart: sql`CASE WHEN ${expired} THEN now() ELSE ${rateLimit.windowStart} END`,
        },
      })
      .returning({ count: rateLimit.count });
    return row.count <= limit.max;
  } catch (err) {
    console.error("Rate limit check failed; allowing the request:", err);
    return true;
  }
}

/** Clears counters nobody has touched for a day. Run from the daily cron. */
export async function purgeRateLimits(): Promise<void> {
  await db
    .delete(rateLimit)
    .where(lt(rateLimit.windowStart, sql`now() - interval '1 day'`));
}
