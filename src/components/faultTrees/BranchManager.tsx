import { createBranch, deleteBranch } from "@/lib/faultTrees/actions";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function BranchManager({
  faultTreeId,
  node,
  allNodes,
}: {
  faultTreeId: string;
  node: {
    id: string;
    outgoingBranches: { id: string; label: string; toNodeId: string }[];
  };
  allNodes: { id: string; prompt: string }[];
}) {
  const promptById = new Map(allNodes.map((n) => [n.id, n.prompt]));
  const targets = allNodes.filter((n) => n.id !== node.id);

  return (
    <div className="ml-4 mt-2 space-y-2 border-l border-slate-200 pl-4 dark:border-zinc-700">
      {node.outgoingBranches.map((branch) => (
        <div key={branch.id} className="flex items-center justify-between text-sm">
          <span>
            <span className="font-medium text-slate-900 dark:text-white">
              {branch.label}
            </span>{" "}
            <span className="text-slate-500 dark:text-slate-500">
              &rarr; {promptById.get(branch.toNodeId) ?? "(unknown)"}
            </span>
          </span>
          <form action={deleteBranch.bind(null, branch.id, faultTreeId)}>
            <Button type="submit" variant="danger">
              Remove
            </Button>
          </form>
        </div>
      ))}

      {targets.length > 0 ? (
        <form
          action={createBranch.bind(null, node.id, faultTreeId)}
          className="flex gap-2"
        >
          <input
            name="label"
            required
            placeholder="Answer label"
            className={`flex-1 ${fieldInputClass}`}
          />
          <select name="toNodeId" required defaultValue="" className={`flex-1 ${fieldInputClass}`}>
            <option value="" disabled>
              Then go to...
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.prompt}
              </option>
            ))}
          </select>
          <input type="hidden" name="sortOrder" value={node.outgoingBranches.length} />
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </form>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Add another node first to link a branch to it.
        </p>
      )}
    </div>
  );
}
