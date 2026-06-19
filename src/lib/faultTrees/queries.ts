import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faultTree, faultTreeBranch, faultTreeNode } from "@/db/schema";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

export async function listFaultTrees(filters: {
  status?: "draft" | "published";
} = {}) {
  return db.query.faultTree.findMany({
    where: filters.status ? eq(faultTree.status, filters.status) : undefined,
    orderBy: [asc(faultTree.title)],
  });
}

export async function getFaultTreesForEquipment(
  equipmentId: string,
  equipmentType: EquipmentType
) {
  const trees = await db.query.faultTree.findMany({
    where: eq(faultTree.status, "published"),
    with: { equipmentLinks: true },
  });

  return trees.filter((tree) => {
    if (tree.equipmentScope === "generic") return true;
    if (tree.equipmentScope === "type_scoped") {
      return tree.scopedEquipmentType === equipmentType;
    }
    return tree.equipmentLinks.some((link) => link.equipmentId === equipmentId);
  });
}

export async function getFaultTree(faultTreeId: string) {
  return db.query.faultTree.findFirst({
    where: eq(faultTree.id, faultTreeId),
    with: { equipmentLinks: true },
  });
}

export async function getTreeWithNodes(faultTreeId: string) {
  const tree = await getFaultTree(faultTreeId);
  if (!tree) return null;

  const nodes = await db.query.faultTreeNode.findMany({
    where: eq(faultTreeNode.faultTreeId, faultTreeId),
    with: {
      outgoingBranches: { orderBy: [asc(faultTreeBranch.sortOrder)] },
      linkedEquipment: true,
      linkedDocument: true,
    },
    orderBy: [asc(faultTreeNode.createdAt)],
  });

  return { tree, nodes };
}
