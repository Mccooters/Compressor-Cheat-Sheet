import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { controller, controllerPassword } from "@/db/schema";

export type ControllerListFilters = {
  q?: string;
};

export async function listControllers(filters: ControllerListFilters = {}) {
  const conditions = [];

  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(controller.manufacturer, term),
        ilike(controller.modelName, term),
        ilike(controller.displayName, term)
      )
    );
  }

  return db.query.controller.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [asc(controller.manufacturer), asc(controller.modelName)],
  });
}

export async function getControllerById(id: string) {
  return db.query.controller.findFirst({
    where: eq(controller.id, id),
    with: {
      passwords: { orderBy: [asc(controllerPassword.sortOrder)] },
      documents: true,
    },
  });
}
