"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { controller, controllerFaultCode, controllerPassword } from "@/db/schema";
import { getCurrentUserEmail } from "@/lib/auth/currentUser";
import { syncControllersFromSharePoint } from "@/lib/controllers/sharepointSync";

const controllerFieldsSchema = z.object({
  manufacturer: z.string().min(1, "Manufacturer is required"),
  modelName: z.string().min(1, "Model name is required"),
  displayName: z.string().min(1, "Display name is required"),
  notes: z.string().optional(),
});

function parseControllerFormData(formData: FormData) {
  return controllerFieldsSchema.parse({
    manufacturer: formData.get("manufacturer"),
    modelName: formData.get("modelName"),
    displayName: formData.get("displayName"),
    notes: formData.get("notes") || undefined,
  });
}

export async function createController(formData: FormData) {
  const values = parseControllerFormData(formData);
  const userEmail = await getCurrentUserEmail();

  const [created] = await db
    .insert(controller)
    .values({ ...values, createdBy: userEmail ?? undefined })
    .returning({ id: controller.id });

  revalidatePath("/controllers");
  redirect(`/controllers/${created.id}`);
}

export async function updateController(id: string, formData: FormData) {
  const values = parseControllerFormData(formData);

  await db
    .update(controller)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(controller.id, id));

  revalidatePath("/controllers");
  revalidatePath(`/controllers/${id}`);
  redirect(`/controllers/${id}`);
}

export async function deleteController(id: string) {
  await db.delete(controller).where(eq(controller.id, id));

  revalidatePath("/controllers");
  revalidatePath("/admin/controllers");
  redirect("/admin/controllers");
}

const passwordFieldsSchema = z.object({
  controllerId: z.string().uuid(),
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
});

export async function addControllerPassword(formData: FormData) {
  const values = passwordFieldsSchema.parse({
    controllerId: formData.get("controllerId"),
    label: formData.get("label"),
    value: formData.get("value"),
  });

  await db.insert(controllerPassword).values(values);

  revalidatePath(`/controllers/${values.controllerId}`);
  revalidatePath(`/admin/controllers/${values.controllerId}/edit`);
}

export async function deleteControllerPassword(
  id: string,
  controllerId: string
) {
  await db.delete(controllerPassword).where(eq(controllerPassword.id, id));

  revalidatePath(`/controllers/${controllerId}`);
  revalidatePath(`/admin/controllers/${controllerId}/edit`);
}

const faultCodeFieldsSchema = z.object({
  controllerId: z.string().uuid(),
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
});

export async function addControllerFaultCode(formData: FormData) {
  const values = faultCodeFieldsSchema.parse({
    controllerId: formData.get("controllerId"),
    code: formData.get("code"),
    description: formData.get("description"),
  });

  await db.insert(controllerFaultCode).values(values);

  revalidatePath(`/controllers/${values.controllerId}`);
  revalidatePath(`/admin/controllers/${values.controllerId}/edit`);
}

export async function deleteControllerFaultCode(
  id: string,
  controllerId: string
) {
  await db.delete(controllerFaultCode).where(eq(controllerFaultCode.id, id));

  revalidatePath(`/controllers/${controllerId}`);
  revalidatePath(`/admin/controllers/${controllerId}/edit`);
}

export async function syncControllersFromSharePointAction() {
  const result = await syncControllersFromSharePoint();

  revalidatePath("/controllers");
  revalidatePath("/admin/controllers");

  const params = new URLSearchParams({
    synced: "1",
    created: String(result.created),
    updated: String(result.updated),
    skipped: String(result.skipped),
  });
  redirect(`/admin/controllers?${params.toString()}`);
}
