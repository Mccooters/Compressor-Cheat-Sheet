import { auth } from "@/auth";

export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}
