"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/currentUser";
import {
  ensureEquipmentFolder,
  ensureEquipmentFolderBatch,
  type FolderRef,
} from "@/lib/graph/equipmentFolders";
import { isGraphConfigured } from "@/lib/graph/config";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

// Syncs SharePoint folders for all active equipment without one.
// Resolves site + drive once, caches parent folder lookups across records.
export async function syncMissingEquipmentFolders() {
  await requireAdmin();

  if (!isGraphConfigured()) {
    redirect("/admin/equipment/sync-folders?error=graph_not_configured");
  }

  try {
    const unlinked = await db
      .select({
        id: equipment.id,
        type: equipment.type,
        manufacturer: equipment.manufacturer,
        modelNumber: equipment.modelNumber,
      })
      .from(equipment)
      .where(and(eq(equipment.status, "active"), isNull(equipment.sharepointFolderUrl)));

    if (unlinked.length === 0) {
      redirect("/admin/equipment/sync-folders?synced=0&errors=0");
    }

    const batchResults = await ensureEquipmentFolderBatch(
      unlinked.map((r) => ({
        type: r.type as EquipmentType,
        manufacturer: r.manufacturer,
        modelNumber: r.modelNumber,
      }))
    );

    let synced = 0;
    let errors = 0;

    for (const item of unlinked) {
      const key = `${item.type}:${item.manufacturer}:${item.modelNumber}`;
      const result = batchResults.get(key);
      if (!result || result instanceof Error) {
        errors++;
        continue;
      }
      const folder = result as FolderRef;
      try {
        await db
          .update(equipment)
          .set({
            sharepointFolderId: folder.id,
            sharepointFolderUrl: folder.webUrl,
            updatedAt: new Date(),
          })
          .where(eq(equipment.id, item.id));
        synced++;
      } catch {
        errors++;
      }
    }

    redirect(`/admin/equipment/sync-folders?synced=${synced}&errors=${errors}`);
  } catch (err) {
    // redirect() throws internally — let it propagate
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    const msg = encodeURIComponent(err instanceof Error ? err.message : String(err));
    redirect(`/admin/equipment/sync-folders?error=${msg}`);
  }
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
