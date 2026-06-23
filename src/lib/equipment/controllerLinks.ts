"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { equipmentController } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/currentUser";

const linkSchema = z.object({
  equipmentId: z.string().uuid(),
  controllerId: z.string().uuid(),
});

export async function linkEquipmentController(formData: FormData) {
  await requireAdmin();
  const values = linkSchema.parse({
    equipmentId: formData.get("equipmentId"),
    controllerId: formData.get("controllerId"),
  });

  // Equipment can have more than one controller type, so this is many-to-
  // many — just ignore if already linked rather than erroring on the
  // composite primary key.
  await db.insert(equipmentController).values(values).onConflictDoNothing();

  revalidatePath(`/equipment/${values.equipmentId}`);
  revalidatePath(`/admin/equipment/${values.equipmentId}/edit`);
}

export async function unlinkEquipmentController(
  equipmentId: string,
  controllerId: string
) {
  await requireAdmin();
  await db
    .delete(equipmentController)
    .where(
      and(
        eq(equipmentController.equipmentId, equipmentId),
        eq(equipmentController.controllerId, controllerId)
      )
    );

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath(`/admin/equipment/${equipmentId}/edit`);
}
