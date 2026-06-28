import type { LintWarning } from "@/lib/faultTrees/lint";

function describeWarning(warning: LintWarning, promptById: Map<string, string>) {
  switch (warning.type) {
    case "missing_root":
      return "No root node set yet — pick a starting question below before publishing.";
    case "unreachable_node":
      return `Unreachable node: "${promptById.get(warning.nodeId) ?? warning.nodeId}" has no branch pointing to it.`;
    case "dead_end_question":
      return `Dead end: "${promptById.get(warning.nodeId) ?? warning.nodeId}" is a question with no answer branches yet.`;
    case "branch_targets_other_tree":
      return "A branch points to a node that no longer exists in this tree.";
  }
}

export function LintPanel({
  warnings,
  promptById,
}: {
  warnings: LintWarning[];
  promptById: Map<string, string>;
}) {
  if (warnings.length === 0) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        No issues found.
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-400">
      {warnings.map((warning, i) => (
        <li key={i}>{describeWarning(warning, promptById)}</li>
      ))}
    </ul>
  );
}
