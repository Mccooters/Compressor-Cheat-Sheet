import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { controller, equipment, faultTree, faultTreeNode, resource } from "@/db/schema";

export async function searchAll(q: string) {
  if (!q.trim()) return { equipment: [], controllers: [], faultTrees: [], swms: [] };
  const term = `%${q.trim()}%`;

  const [equipmentResults, controllerResults, treesByTitle, nodesWithTree, swmsResults] = await Promise.all([
    db.query.equipment.findMany({
      where: or(
        ilike(equipment.displayName, term),
        ilike(equipment.manufacturer, term),
        ilike(equipment.modelNumber, term)
      ),
      orderBy: [asc(equipment.manufacturer), asc(equipment.modelNumber)],
      limit: 20,
    }),
    db.query.controller.findMany({
      where: or(
        ilike(controller.displayName, term),
        ilike(controller.manufacturer, term),
        ilike(controller.modelName, term)
      ),
      orderBy: [asc(controller.manufacturer), asc(controller.modelName)],
      limit: 20,
    }),
    db.query.faultTree.findMany({
      where: and(
        eq(faultTree.status, "published"),
        or(ilike(faultTree.title, term), ilike(faultTree.description, term))
      ),
      orderBy: [asc(faultTree.title)],
      limit: 20,
    }),
    db.query.faultTreeNode.findMany({
      where: or(
        ilike(faultTreeNode.prompt, term),
        ilike(faultTreeNode.probableCause, term),
        ilike(faultTreeNode.recommendedFix, term)
      ),
      with: { faultTree: true },
      limit: 20,
    }),
    db.query.resource.findMany({
      where: and(eq(resource.area, "swms"), ilike(resource.title, term)),
      orderBy: [asc(resource.title)],
      limit: 20,
    }),
  ]);

  const faultTreeMatches = new Map<
    string,
    { id: string; title: string; description: string | null }
  >();
  for (const tree of treesByTitle) {
    faultTreeMatches.set(tree.id, tree);
  }
  for (const node of nodesWithTree) {
    if (node.faultTree.status === "published") {
      faultTreeMatches.set(node.faultTree.id, node.faultTree);
    }
  }

  return {
    equipment: equipmentResults,
    controllers: controllerResults,
    faultTrees: Array.from(faultTreeMatches.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
    swms: swmsResults,
  };
}
