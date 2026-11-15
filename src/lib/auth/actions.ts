"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { ASSIGNABLE_ROLES, type UserRole } from "@/lib/auth/access";
import { requireAdmin } from "@/lib/auth/currentUser";

// Approving someone is setting their role from "pending" to one of these.
export async function setUserRole(userId: string, role: UserRole) {
  const session = await requireAdmin();
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new Error("That isn't a role that can be given.");
  }

  const target = await db.query.appUser.findFirst({
    where: eq(appUser.id, userId),
  });
  if (!target) return;
  if (target.email === session?.user?.email) {
    throw new Error("You can't change your own role — ask another admin.");
  }

  await db
    .update(appUser)
    .set({ role, updatedAt: new Date() })
    .where(eq(appUser.id, userId));

  revalidatePath("/admin/users");
}

// Removing someone deletes their row. Their browser is signed out the next
// time its role is checked (within a minute; see src/auth.ts). If they
// sign in again they are back to waiting for approval.
export async function removeUser(userId: string) {
  const session = await requireAdmin();

  const target = await db.query.appUser.findFirst({
    where: eq(appUser.id, userId),
  });
  if (!target) return;
  if (target.email === session?.user?.email) {
    throw new Error("You can't remove yourself — ask another admin.");
  }

  await db.delete(appUser).where(eq(appUser.id, userId));

  revalidatePath("/admin/users");
}
