"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/currentUser";
import { ensureEquipmentFolder } from "@/lib/graph/equipmentFolders";
import { isGraphConfigured } from "@/lib/graph/config";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

// Syncs SharePoint folders for all equipment that don't have one yet.
// Requires an active Microsoft session (delegated Graph permissions).
export async function syncMissingEquipmentFolders() {
  await requireAdmin();

  if (!isGraphConfigured()) {
    redirect("/admin/equipment/sync-folders?error=graph_not_configured");
  }

  const unlinked = await db
    .select({
      id: equipment.id,
      type: equipment.type,
      manufacturer: equipment.manufacturer,
      modelNumber: equipment.modelNumber,
    })
    .from(equipment)
    .where(and(eq(equipment.status, "active"), isNull(equipment.sharepointFolderUrl)));

  let synced = 0;
  let errors = 0;

  for (const item of unlinked) {
    try {
      const folder = await ensureEquipmentFolder({
        type: item.type as EquipmentType,
        manufacturer: item.manufacturer,
        modelNumber: item.modelNumber,
      });
      if (folder) {
        await db
          .update(equipment)
          .set({
            sharepointFolderId: folder.id,
            sharepointFolderUrl: folder.webUrl,
            updatedAt: new Date(),
          })
          .where(eq(equipment.id, item.id));
        synced++;
      }
    } catch {
      errors++;
    }
  }

  redirect(
    `/admin/equipment/sync-folders?synced=${synced}&errors=${errors}`
  );
}

// Syncs a single equipment record's SharePoint folder.
export async function syncEquipmentFolder(id: string) {
  await requireAdmin();

  const item = await db.query.equipment.findFirst({
    where: eq(equipment.id, id),
    columns: { id: true, type: true, manufacturer: true, modelNumber: true },
  });
  if (!item) return { ok: false, error: "Not found" };

  try {
    const folder = await ensureEquipmentFolder({
      type: item.type as EquipmentType,
      manufacturer: item.manufacturer,
      modelNumber: item.modelNumber,
    });
    if (folder) {
      await db
        .update(equipment)
        .set({
          sharepointFolderId: folder.id,
          sharepointFolderUrl: folder.webUrl,
          updatedAt: new Date(),
        })
        .where(eq(equipment.id, id));
      return { ok: true, webUrl: folder.webUrl };
    }
    return { ok: false, error: "Folder config not set" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
