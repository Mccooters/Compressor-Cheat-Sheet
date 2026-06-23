"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { documentLink } from "@/db/schema";
import { getCurrentUserEmail, requireAdmin } from "@/lib/auth/currentUser";
import { isGraphConfigured } from "@/lib/graph/config";
import {
  getDriveItemMetadata,
  searchDriveItems,
  type SharePointHit,
} from "@/lib/graph/sharepoint";

const docTypes = [
  "manual",
  "datasheet",
  "wiring_diagram",
  "parts_list",
  "photo",
  "other",
] as const;

const manualLinkSchema = z.object({
  equipmentId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  docType: z.enum(docTypes),
  webUrl: z.string().url("Must be a valid URL"),
});

export async function addManualLink(formData: FormData) {
  await requireAdmin();
  const values = manualLinkSchema.parse({
    equipmentId: formData.get("equipmentId"),
    title: formData.get("title"),
    docType: formData.get("docType"),
    webUrl: formData.get("webUrl"),
  });
  const userEmail = await getCurrentUserEmail();

  await db.insert(documentLink).values({
    ...values,
    source: "manual_link",
    addedBy: userEmail ?? undefined,
  });

  revalidatePath(`/equipment/${values.equipmentId}`);
  revalidatePath(`/admin/equipment/${values.equipmentId}/edit`);
}

export async function deleteDocumentLink(id: string, equipmentId: string) {
  await requireAdmin();
  await db.delete(documentLink).where(eq(documentLink.id, id));
  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath(`/admin/equipment/${equipmentId}/edit`);
}

export async function searchSharePointAction(query: string): Promise<SharePointHit[]> {
  await requireAdmin();
  if (!isGraphConfigured()) return [];
  if (!query.trim()) return [];
  return searchDriveItems(query);
}

export async function addGraphDocumentLink(
  equipmentId: string,
  docType: (typeof docTypes)[number],
  hit: SharePointHit
) {
  await requireAdmin();
  const userEmail = await getCurrentUserEmail();

  await db.insert(documentLink).values({
    equipmentId,
    title: hit.name,
    docType,
    source: "graph",
    sharepointDriveId: hit.driveId,
    sharepointItemId: hit.itemId,
    webUrl: hit.webUrl,
    fileName: hit.name,
    lastModifiedAt: hit.lastModifiedDateTime ? new Date(hit.lastModifiedDateTime) : undefined,
    cachedAt: new Date(),
    addedBy: userEmail ?? undefined,
  });

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath(`/admin/equipment/${equipmentId}/edit`);
}

export async function refreshDocumentLinkMetadata(
  documentLinkId: string,
  equipmentId: string
) {
  await requireAdmin();
  if (!isGraphConfigured()) return;

  const doc = await db.query.documentLink.findFirst({
    where: eq(documentLink.id, documentLinkId),
  });
  if (!doc || doc.source !== "graph" || !doc.sharepointDriveId || !doc.sharepointItemId) {
    return;
  }

  const metadata = await getDriveItemMetadata(doc.sharepointDriveId, doc.sharepointItemId);

  await db
    .update(documentLink)
    .set({
      fileName: metadata.name,
      webUrl: metadata.webUrl,
      lastModifiedAt: metadata.lastModifiedDateTime
        ? new Date(metadata.lastModifiedDateTime)
        : null,
      cachedAt: new Date(),
    })
    .where(eq(documentLink.id, documentLinkId));

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath(`/admin/equipment/${equipmentId}/edit`);
}
