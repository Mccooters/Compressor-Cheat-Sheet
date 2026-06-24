import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { resource } from "@/db/schema";

export type ResourceArea = "breathing_air" | "swms" | "installations";

export async function listResources(area: ResourceArea, q?: string) {
  const term = q?.trim() ? `%${q.trim()}%` : null;
  return db.query.resource.findMany({
    where: term
      ? and(eq(resource.area, area), ilike(resource.title, term))
      : eq(resource.area, area),
    orderBy: [asc(resource.title)],
  });
}
