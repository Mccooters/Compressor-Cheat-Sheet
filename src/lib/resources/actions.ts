"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { resource } from "@/db/schema";
import { getCurrentUserEmail, requireAdmin } from "@/lib/auth/currentUser";
import type { SharePointHit } from "@/lib/graph/sharepoint";
import type { ResourceArea } from "@/lib/resources/queries";

const AREA_PATHS: Record<ResourceArea, string> = {
  breathing_air: "/breathing-air-inspections",
  swms: "/swms",
  installations: "/installations",
};

const manualLinkSchema = z.object({
  area: z.enum(["breathing_air", "swms", "installations"]),
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1),
  webUrl: z.string().url("Must be a valid URL"),
});

export async function addResourceManualLink(formData: FormData) {
  await requireAdmin();
  const values = manualLinkSchema.parse({
    area: formData.get("area"),
    title: formData.get("title"),
    category: formData.get("category"),
    webUrl: formData.get("webUrl"),
  });
  const userEmail = await getCurrentUserEmail();

  await db.insert(resource).values({
    ...values,
    source: "manual_link",
    addedBy: userEmail ?? undefined,
  });

  revalidatePath(AREA_PATHS[values.area]);
}

export async function addResourceGraphResource(
  area: ResourceArea,
  category: string,
  hit: SharePointHit
) {
  await requireAdmin();
  const userEmail = await getCurrentUserEmail();

  await db.insert(resource).values({
    area,
    title: hit.name,
    category,
    source: "graph",
    sharepointDriveId: hit.driveId,
    sharepointItemId: hit.itemId,
    webUrl: hit.webUrl,
    fileName: hit.name,
    addedBy: userEmail ?? undefined,
  });

  revalidatePath(AREA_PATHS[area]);
}

export async function deleteResource(id: string, area: ResourceArea) {
  await requireAdmin();
  await db.delete(resource).where(eq(resource.id, id));
  revalidatePath(AREA_PATHS[area]);
}
