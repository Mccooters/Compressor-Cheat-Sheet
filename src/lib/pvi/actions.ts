"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { pviResource } from "@/db/schema";
import { getCurrentUserEmail, requireAdmin } from "@/lib/auth/currentUser";
import type { SharePointHit } from "@/lib/graph/sharepoint";

const categories = ["cheat_sheet", "other"] as const;
export type PviResourceCategory = (typeof categories)[number];

const manualLinkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(categories),
  webUrl: z.string().url("Must be a valid URL"),
});

export async function addPviManualLink(formData: FormData) {
  await requireAdmin();
  const values = manualLinkSchema.parse({
    title: formData.get("title"),
    category: formData.get("category"),
    webUrl: formData.get("webUrl"),
  });
  const userEmail = await getCurrentUserEmail();

  await db.insert(pviResource).values({
    ...values,
    source: "manual_link",
    addedBy: userEmail ?? undefined,
  });

  revalidatePath("/pressure-vessel-inspection");
}

export async function addPviGraphResource(
  category: PviResourceCategory,
  hit: SharePointHit
) {
  await requireAdmin();
  const userEmail = await getCurrentUserEmail();

  await db.insert(pviResource).values({
    title: hit.name,
    category,
    source: "graph",
    sharepointDriveId: hit.driveId,
    sharepointItemId: hit.itemId,
    webUrl: hit.webUrl,
    fileName: hit.name,
    addedBy: userEmail ?? undefined,
  });

  revalidatePath("/pressure-vessel-inspection");
}

export async function deletePviResource(id: string) {
  await requireAdmin();
  await db.delete(pviResource).where(eq(pviResource.id, id));
  revalidatePath("/pressure-vessel-inspection");
}
