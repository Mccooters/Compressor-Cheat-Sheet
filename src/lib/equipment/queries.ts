import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { documentLink, equipment } from "@/db/schema";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

export type EquipmentSortField = "displayName" | "type" | "manufacturer" | "status";

export type EquipmentListFilters = {
  type?: EquipmentType;
  q?: string;
  includeArchived?: boolean;
  sort?: EquipmentSortField;
  dir?: "asc" | "desc";
};

export async function listEquipment(filters: EquipmentListFilters = {}) {
  const conditions = [];

  if (!filters.includeArchived) {
    conditions.push(eq(equipment.status, "active"));
  }
  if (filters.type) {
    conditions.push(eq(equipment.type, filters.type));
  }
  if (filters.q) {
    const term = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(equipment.displayName, term),
        ilike(equipment.manufacturer, term),
        ilike(equipment.modelNumber, term)
      )
    );
  }

  const dir = filters.dir === "desc" ? desc : asc;
  const orderBy =
    filters.sort === "displayName"
      ? [dir(equipment.displayName)]
      : filters.sort === "type"
        ? [dir(equipment.type), asc(equipment.manufacturer), asc(equipment.modelNumber)]
        : filters.sort === "status"
          ? [dir(equipment.status), asc(equipment.manufacturer), asc(equipment.modelNumber)]
          : [dir(equipment.manufacturer), dir(equipment.modelNumber)];

  return db.query.equipment.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy,
    with: {
      documents: { where: eq(documentLink.docType, "photo"), limit: 1 },
    },
  });
}

export async function getEquipmentById(id: string) {
  return db.query.equipment.findFirst({
    where: eq(equipment.id, id),
    with: {
      documents: true,
      controllerLinks: { with: { controller: true } },
    },
  });
}

export async function listActiveEquipmentSummaries() {
  return db.query.equipment.findMany({
    where: eq(equipment.status, "active"),
    orderBy: [asc(equipment.displayName)],
    columns: {
      id: true,
      type: true,
      displayName: true,
      manufacturer: true,
      modelNumber: true,
    },
  });
}
