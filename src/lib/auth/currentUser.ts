import { cache } from "react";
import { auth } from "@/auth";
import { hasRole, type UserRole } from "@/lib/auth/access";
import { findUserRole } from "@/lib/auth/roles";

export async function getCurrentUserEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

// Cached per request so rendering a page that checks role in several places
// (e.g. Nav plus the page body) only hits the DB once.
//
// The role on record right now, read from the database (the request gate
// works from the copy in the session cookie, up to a minute old). Null when
// not signed in, or when an admin has removed the person: a row is only ever
// created at sign-in (src/auth.ts), never by looking, so someone who has been
// removed doesn't put themselves back on the waiting list by loading a page.
export const getCurrentUserRole = cache(async (): Promise<UserRole | null> => {
  const session = await auth();
  if (!session?.user?.email) return null;
  return findUserRole(session.user.email);
});

export async function requireAdmin() {
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    throw new Error("Admin access required");
  }
  return auth();
}

/**
 * For a page or action only some people may use: throws unless the signed-in
 * person is `atLeast` or higher (viewer < staff < admin). The request gate
 * already keeps out anyone not approved; this is for the finer line.
 */
export async function requireRole(atLeast: UserRole) {
  const role = await getCurrentUserRole();
  if (!hasRole(role, atLeast)) {
    throw new Error("You don't have access to this.");
  }
  return auth();
}
