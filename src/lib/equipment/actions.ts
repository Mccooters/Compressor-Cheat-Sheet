"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { getCurrentUserEmail } from "@/lib/auth/currentUser";
import { EQUIPMENT_TYPES, parseSpecs } from "@/lib/equipment/specSchemas";

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
  const values = parseEquipmentFormData(formData);
  const userEmail = await getCurrentUserEmail();

  const [created] = await db
    .insert(equipment)
    .values({ ...values, createdBy: userEmail ?? undefined })
    .returning({ id: equipment.id });

  revalidatePath("/equipment");
  redirect(`/equipment/${created.id}`);
}

export async function updateEquipment(id: string, formData: FormData) {
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
  await db
    .update(equipment)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(equipment.id, id));

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${id}`);
  redirect("/admin/equipment");
}

export async function deleteEquipment(id: string) {
  await db.delete(equipment).where(eq(equipment.id, id));

  revalidatePath("/equipment");
  revalidatePath("/admin/equipment");
  redirect("/admin/equipment");
}

export async function deleteManyEquipment(ids: string[]) {
  if (ids.length === 0) return;

  await db.delete(equipment).where(inArray(equipment.id, ids));

  revalidatePath("/equipment");
  revalidatePath("/admin/equipment");
}
