"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/currentUser";
import { createMobileToken, revokeMobileToken } from "@/lib/mobile/tokens";

export type NewTokenState = {
  /** The token, shown this once. */
  token?: string;
  label?: string;
  error?: string;
};

export async function createPhoneToken(
  _previous: NewTokenState,
  formData: FormData
): Promise<NewTokenState> {
  const session = await requireAdmin();
  const label = formData.get("label")?.toString().trim() ?? "";
  if (!label) return { error: "Say whose phone it is." };
  if (label.length > 80) return { error: "Keep the name under 80 characters." };

  const token = await createMobileToken(label, session?.user?.email ?? null);
  revalidatePath("/admin/phones");
  return { token, label };
}

export async function revokePhoneToken(id: string) {
  await requireAdmin();
  await revokeMobileToken(id);
  revalidatePath("/admin/phones");
}
