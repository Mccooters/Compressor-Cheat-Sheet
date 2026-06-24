import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { resource } from "@/db/schema";

export type ResourceArea = "breathing_air" | "swms" | "installations";

export async function listResources(area: ResourceArea) {
  return db.query.resource.findMany({
    where: eq(resource.area, area),
    orderBy: [asc(resource.createdAt)],
  });
}
