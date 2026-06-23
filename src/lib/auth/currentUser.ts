import { cache } from "react";
import { auth } from "@/auth";
import { resolveUserRole, type UserRole } from "@/lib/auth/roles";

export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

// A DB lookup, so this must never run from middleware/proxy — that runs in
// a separate, lightweight execution context that isn't meant to depend on
// shared modules like a connection pool (the Next.js docs say so explicitly).
// auth()'s own jwt/session callbacks stay DB-free for the same reason; role
// is resolved here instead, on demand, from actual page/action code only.
// Cached per request so rendering a page that checks role in several places
// (e.g. Nav plus the page body) only hits the DB once.
export const getCurrentUserRole = cache(async (): Promise<UserRole | null> => {
  const session = await auth();
  if (!session?.user?.email) return null;
  return resolveUserRole(session.user.email, session.user.name ?? null);
});

// Server actions must call this themselves — hiding the Edit button in the
// UI isn't enforcement, since a viewer could still invoke the action's
// endpoint directly.
export async function requireAdmin() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Admin access required");
  }
  return auth();
}
