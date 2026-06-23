"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/currentUser";
import type { UserRole } from "@/lib/auth/roles";

export async function setUserRole(userId: string, role: UserRole) {
  const session = await requireAdmin();

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
