import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { mobileToken } from "@/db/schema";

// Per-phone access tokens for the apps' endpoints (/api/snapshot,
// /api/documents, /api/asset-tags, /api/assets).
//
// Until now every phone carried the same token (MOBILE_API_TOKEN), so one
// lost phone meant changing it on all of them. These are made one per phone
// from /admin/phones and can be revoked one at a time. Only the SHA-256 of
// a token is stored: the token itself is shown once, when it is made.

const PREFIX = "aa_";

/** A new token: "aa_" and 32 random bytes. Long and random, so a plain hash is enough. */
export function generateToken(): string {
  return PREFIX + randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf-8").digest("hex");
}

/** How often a token's "last used" time is written: not on every request. */
export const LAST_USED_EVERY_MS = 60 * 60_000;

export function needsLastUsedUpdate(lastUsedAt: Date | null, now: Date): boolean {
  return !lastUsedAt || now.getTime() - lastUsedAt.getTime() >= LAST_USED_EVERY_MS;
}

/** Makes a token for a phone and returns it. This is the only time it can be read. */
export async function createMobileToken(
  label: string,
  createdBy: string | null
): Promise<string> {
  const token = generateToken();
  await db
    .insert(mobileToken)
    .values({ label, tokenHash: hashToken(token), createdBy });
  return token;
}

export async function listMobileTokens() {
  return db
    .select({
      id: mobileToken.id,
      label: mobileToken.label,
      createdBy: mobileToken.createdBy,
      createdAt: mobileToken.createdAt,
      lastUsedAt: mobileToken.lastUsedAt,
      revokedAt: mobileToken.revokedAt,
    })
    .from(mobileToken)
    .orderBy(desc(mobileToken.createdAt));
}

export async function revokeMobileToken(id: string): Promise<void> {
  await db
    .update(mobileToken)
    .set({ revokedAt: new Date() })
    .where(and(eq(mobileToken.id, id), isNull(mobileToken.revokedAt)));
}

/** Whether a supplied token is one of the phones' and hasn't been revoked. */
export async function isActiveMobileToken(
  supplied: string,
  now = new Date()
): Promise<boolean> {
  if (!supplied.startsWith(PREFIX)) return false;
  const [row] = await db
    .select({ id: mobileToken.id, lastUsedAt: mobileToken.lastUsedAt })
    .from(mobileToken)
    .where(
      and(eq(mobileToken.tokenHash, hashToken(supplied)), isNull(mobileToken.revokedAt))
    )
    .limit(1);
  if (!row) return false;
  if (needsLastUsedUpdate(row.lastUsedAt, now)) {
    // Bookkeeping only: a failure here mustn't turn a good token away.
    await db
      .update(mobileToken)
      .set({ lastUsedAt: now })
      .where(eq(mobileToken.id, row.id))
      .catch((err) => console.error("Couldn't record a phone token's use:", err));
  }
  return true;
}

export async function hasActiveMobileTokens(): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mobileToken)
    .where(isNull(mobileToken.revokedAt));
  return Number(count) > 0;
}
