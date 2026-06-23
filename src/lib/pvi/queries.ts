import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pviResource } from "@/db/schema";

export async function listPviResources() {
  return db.query.pviResource.findMany({
    orderBy: [asc(pviResource.createdAt)],
  });
}
