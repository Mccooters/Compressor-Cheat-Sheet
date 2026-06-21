import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { controller, controllerPassword, documentLink } from "@/db/schema";

export type ControllerSortField = "manufacturer" | "modelName";

export type ControllerListFilters = {
  q?: string;
  sort?: ControllerSortField;
  dir?: "asc" | "desc";
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

  const dir = filters.dir === "desc" ? desc : asc;
  const orderBy =
    filters.sort === "modelName"
      ? [dir(controller.modelName)]
      : [dir(controller.manufacturer), asc(controller.modelName)];

  return db.query.controller.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy,
    with: {
      documents: { where: eq(documentLink.docType, "photo"), limit: 1 },
    },
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
