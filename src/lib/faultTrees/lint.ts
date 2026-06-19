export type LintableNode = {
  id: string;
  nodeType: "question" | "diagnosis";
  outgoingBranches: { id: string; toNodeId: string }[];
};

export type LintWarning =
  | { type: "missing_root" }
  | { type: "unreachable_node"; nodeId: string }
  | { type: "dead_end_question"; nodeId: string }
  | { type: "branch_targets_other_tree"; branchId: string };

export function lintFaultTree(
  tree: { rootNodeId: string | null },
  nodes: LintableNode[]
): LintWarning[] {
  const warnings: LintWarning[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  if (!tree.rootNodeId || !nodeIds.has(tree.rootNodeId)) {
    warnings.push({ type: "missing_root" });
  }

  const reachable = new Set<string>();
  if (tree.rootNodeId) reachable.add(tree.rootNodeId);

  for (const node of nodes) {
    for (const branch of node.outgoingBranches) {
      reachable.add(branch.toNodeId);
      if (!nodeIds.has(branch.toNodeId)) {
        warnings.push({
          type: "branch_targets_other_tree",
          branchId: branch.id,
        });
      }
    }
  }

  for (const node of nodes) {
    if (node.id !== tree.rootNodeId && !reachable.has(node.id)) {
      warnings.push({ type: "unreachable_node", nodeId: node.id });
    }
    if (node.nodeType === "question" && node.outgoingBranches.length === 0) {
      warnings.push({ type: "dead_end_question", nodeId: node.id });
    }
  }

  return warnings;
}

export function canPublish(warnings: LintWarning[]): boolean {
  return !warnings.some((w) => w.type === "missing_root");
}
