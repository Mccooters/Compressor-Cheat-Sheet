"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { documentLink } from "@/db/schema";
import { getCurrentUserEmail } from "@/lib/auth/currentUser";
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
  controllerId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  docType: z.enum(docTypes),
  webUrl: z.string().url("Must be a valid URL"),
});

export async function addControllerManualLink(formData: FormData) {
  const values = manualLinkSchema.parse({
    controllerId: formData.get("controllerId"),
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

  revalidatePath(`/controllers/${values.controllerId}`);
  revalidatePath(`/admin/controllers/${values.controllerId}/edit`);
}

export async function deleteControllerDocumentLink(
  id: string,
  controllerId: string
) {
  await db.delete(documentLink).where(eq(documentLink.id, id));
  revalidatePath(`/controllers/${controllerId}`);
  revalidatePath(`/admin/controllers/${controllerId}/edit`);
}

export async function searchControllerSharePointAction(
  query: string
): Promise<SharePointHit[]> {
  if (!isGraphConfigured()) return [];
  if (!query.trim()) return [];
  return searchDriveItems(query);
}

export async function addControllerGraphDocumentLink(
  controllerId: string,
  docType: (typeof docTypes)[number],
  hit: SharePointHit
) {
  const userEmail = await getCurrentUserEmail();

  await db.insert(documentLink).values({
    controllerId,
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

  revalidatePath(`/controllers/${controllerId}`);
  revalidatePath(`/admin/controllers/${controllerId}/edit`);
}

export async function refreshControllerDocumentLinkMetadata(
  documentLinkId: string,
  controllerId: string
) {
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

  revalidatePath(`/controllers/${controllerId}`);
  revalidatePath(`/admin/controllers/${controllerId}/edit`);
}
