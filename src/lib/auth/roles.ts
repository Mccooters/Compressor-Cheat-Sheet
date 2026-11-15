import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import type { UserRole } from "@/lib/auth/access";

export type { UserRole } from "@/lib/auth/access";

export async function listAppUsers() {
  return db.query.appUser.findMany({
    orderBy: [asc(appUser.email)],
  });
}

/** The role on record for an email, or null when there's no such person. Never creates one. */
export async function findUserRole(email: string): Promise<UserRole | null> {
  const existing = await db.query.appUser.findFirst({
    where: eq(appUser.email, email),
    columns: { role: true },
  });
  return existing?.role ?? null;
}

// Looks up the role for an email, creating the row on first sight. The very
// first user ever becomes admin automatically (bootstrap); everyone after is
// "pending", which lets them sign in but shows them nothing until an admin
// approves them from /admin/users.
export async function resolveUserRole(
  email: string,
  name?: string | null
): Promise<UserRole> {
  const existing = await findUserRole(email);
  if (existing) return existing;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appUser);
  const role: UserRole = Number(count) === 0 ? "admin" : "pending";

  await db
    .insert(appUser)
    .values({ email, name, role })
    .onConflictDoNothing({ target: appUser.email });

  // Two first requests can race; whichever row was written is the answer.
  return (await findUserRole(email)) ?? role;
}
