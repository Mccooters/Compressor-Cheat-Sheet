import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";

export type UserRole = "admin" | "viewer";

export async function listAppUsers() {
  // "admin" sorts before "viewer" alphabetically, so this naturally groups
  // admins at the top without a more elaborate orderBy.
  return db.query.appUser.findMany({
    orderBy: [asc(appUser.role), asc(appUser.email)],
  });
}

// Called on every auth() check. The common case (existing user) is a single
// indexed lookup; a new email only hits the extra insert path once, ever.
export async function resolveUserRole(
  email: string,
  name?: string | null
): Promise<UserRole> {
  const existing = await db.query.appUser.findFirst({
    where: eq(appUser.email, email),
    columns: { role: true },
  });
  if (existing) return existing.role;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(appUser);
  const role: UserRole = Number(count) === 0 ? "admin" : "viewer";

  await db
    .insert(appUser)
    .values({ email, name, role })
    .onConflictDoNothing({ target: appUser.email });

  return role;
}
