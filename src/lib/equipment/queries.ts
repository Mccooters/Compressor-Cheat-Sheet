import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { documentLink, equipment } from "@/db/schema";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

export type EquipmentListFilters = {
  type?: EquipmentType;
  q?: string;
  includeArchived?: boolean;
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

  return db.query.equipment.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [asc(equipment.manufacturer), asc(equipment.modelNumber)],
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
