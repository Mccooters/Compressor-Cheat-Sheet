"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { getCurrentUserEmail, requireAdmin } from "@/lib/auth/currentUser";
import { EQUIPMENT_TYPES, parseSpecs } from "@/lib/equipment/specSchemas";
import { ensureEquipmentFolder } from "@/lib/graph/equipmentFolders";
import { isGraphConfigured } from "@/lib/graph/config";

const equipmentFieldsSchema = z.object({
  type: z.enum(EQUIPMENT_TYPES),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  modelNumber: z.string().min(1, "Model number is required"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
});

function extractSpecsFromFormData(formData: FormData) {
  const specs: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("spec_") && value !== "") {
      specs[key.slice("spec_".length)] = value;
    }
  }
  return specs;
}

function parseEquipmentFormData(formData: FormData) {
  const fields = equipmentFieldsSchema.parse({
    type: formData.get("type"),
    manufacturer: formData.get("manufacturer"),
    modelNumber: formData.get("modelNumber"),
    displayName: formData.get("displayName"),
    description: formData.get("description") || undefined,
  });
  const specs = parseSpecs(fields.type, extractSpecsFromFormData(formData));
  return { ...fields, specs };
}

export async function createEquipment(formData: FormData) {
  await requireAdmin();
  const values = parseEquipmentFormData(formData);
  const userEmail = await getCurrentUserEmail();

  const [created] = await db
    .insert(equipment)
    .values({ ...values, createdBy: userEmail ?? undefined })
    .returning({ id: equipment.id });

  // Auto-create SharePoint folder if Graph is configured and user is signed in
  // with Microsoft. Runs after insert; failure is non-fatal (folder can be
  // created later via the admin sync-folders page).
  if (isGraphConfigured()) {
    try {
      const folder = await ensureEquipmentFolder(values);
      if (folder) {
        await db
          .update(equipment)
          .set({
            sharepointFolderId: folder.id,
            sharepointFolderUrl: folder.webUrl,
            updatedAt: new Date(),
          })
          .where(eq(equipment.id, created.id));
      }
    } catch {
      // Non-fatal — folder can be synced later via /admin/equipment/sync-folders
    }
  }

  revalidatePath("/equipment");
  redirect(`/equipment/${created.id}`);
}

export async function updateEquipment(id: string, formData: FormData) {
  await requireAdmin();
  const values = parseEquipmentFormData(formData);

  await db
    .update(equipment)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(equipment.id, id));

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
  redirect(`/equipment/${id}`);
}

export async function archiveEquipment(id: string) {
  await requireAdmin();
  await db
    .update(equipment)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(equipment.id, id));

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
  redirect("/admin/equipment");
}

export async function deleteEquipment(id: string) {
  await requireAdmin();
  await db.delete(equipment).where(eq(equipment.id, id));

  revalidatePath("/equipment");
  revalidatePath("/admin/equipment");
  redirect("/admin/equipment");
}

export async function deleteManyEquipment(ids: string[]) {
  await requireAdmin();
  if (ids.length === 0) return;

  await db.delete(equipment).where(inArray(equipment.id, ids));

  revalidatePath("/equipment");
  revalidatePath("/admin/equipment");
}
