import { auth } from "@/auth";

export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

// Server actions must call this themselves — hiding the Edit button in the
// UI isn't enforcement, since a viewer could still invoke the action's
// endpoint directly.
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Admin access required");
  }
  return session;
}
