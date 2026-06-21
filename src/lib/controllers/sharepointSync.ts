import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { controller, controllerPassword } from "@/db/schema";
import { getListItems, resolveSharedList } from "@/lib/graph/lists";

type SharePointControllerFields = {
  Title?: string;
  Manufacturer?: string;
  FactoryPassword?: string;
  ServicePassword?: string;
  CustomerPassword?: string;
  PasswordInstructions?: string;
};

export type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  skippedReasons: string[];
};

// The SharePoint "Controller Passwords" list is one row per controller
// (Title = model name) with FactoryPassword/ServicePassword/CustomerPassword
// columns, not one row per code — confirmed via the sharepoint-inspect
// diagnostic page against the real list on 2026-06-21.
export async function syncControllersFromSharePoint(): Promise<SyncResult> {
  const listUrl = process.env.SHAREPOINT_CONTROLLER_LIST_URL;
  if (!listUrl) {
    throw new Error("SHAREPOINT_CONTROLLER_LIST_URL is not set");
  }

  const { siteId, listId } = await resolveSharedList(listUrl);
  const items = await getListItems(siteId, listId);

  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    skippedReasons: [],
  };

  for (const item of items) {
    const fields = item.fields as SharePointControllerFields;
    const modelName = fields.Title?.trim();
    const manufacturer = fields.Manufacturer?.trim();

    if (!modelName || !manufacturer) {
      result.skipped++;
      result.skippedReasons.push(`item ${item.id}: missing Title or Manufacturer`);
      continue;
    }

    const displayName = `${manufacturer} ${modelName}`;
    const notes = fields.PasswordInstructions?.trim() || null;

    // Match by sharepointItemId first (stable across renames), then fall
    // back to manufacturer+model so a row already created by the PDF
    // transcription gets adopted instead of duplicated.
    let existing = await db.query.controller.findFirst({
      where: eq(controller.sharepointItemId, item.id),
    });
    if (!existing) {
      existing = await db.query.controller.findFirst({
        where: and(
          eq(controller.manufacturer, manufacturer),
          eq(controller.modelName, modelName)
        ),
      });
    }

    let controllerId: string;
    if (existing) {
      await db
        .update(controller)
        .set({
          manufacturer,
          modelName,
          displayName,
          notes,
          source: "sharepoint_sync",
          sharepointListId: listId,
          sharepointItemId: item.id,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(controller.id, existing.id));
      controllerId = existing.id;
      result.updated++;
    } else {
      const [created] = await db
        .insert(controller)
        .values({
          manufacturer,
          modelName,
          displayName,
          notes,
          source: "sharepoint_sync",
          sharepointListId: listId,
          sharepointItemId: item.id,
          lastSyncedAt: new Date(),
          createdBy: "sharepoint-sync",
        })
        .returning({ id: controller.id });
      controllerId = created.id;
      result.created++;
    }

    // This sync is the source of truth for Factory/Service/Customer codes —
    // clear out whatever it wrote last time and reinsert current values.
    // Manually-added codes (source = 'manual') are untouched.
    await db
      .delete(controllerPassword)
      .where(
        and(
          eq(controllerPassword.controllerId, controllerId),
          eq(controllerPassword.source, "sharepoint_sync")
        )
      );

    const passwordRows = [
      { label: "Factory", value: fields.FactoryPassword?.trim() },
      { label: "Service", value: fields.ServicePassword?.trim() },
      { label: "Customer", value: fields.CustomerPassword?.trim() },
    ].filter(
      (row): row is { label: string; value: string } => Boolean(row.value)
    );

    for (const [i, row] of passwordRows.entries()) {
      await db.insert(controllerPassword).values({
        controllerId,
        label: row.label,
        value: row.value,
        sortOrder: i,
        source: "sharepoint_sync",
        sharepointItemId: item.id,
      });
    }
  }

  return result;
}
