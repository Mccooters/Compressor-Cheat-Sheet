import { createBranch, deleteBranch } from "@/lib/faultTrees/actions";

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
    <div className="ml-4 mt-2 space-y-2 border-l border-neutral-200 pl-4 dark:border-neutral-800">
      {node.outgoingBranches.map((branch) => (
        <div key={branch.id} className="flex items-center justify-between text-sm">
          <span>
            <span className="font-medium">{branch.label}</span>{" "}
            <span className="text-neutral-500">
              &rarr; {promptById.get(branch.toNodeId) ?? "(unknown)"}
            </span>
          </span>
          <form action={deleteBranch.bind(null, branch.id, faultTreeId)}>
            <button type="submit" className="text-red-600 hover:underline">
              Remove
            </button>
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
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            name="toNodeId"
            required
            defaultValue=""
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
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
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700"
          >
            Add
          </button>
        </form>
      ) : (
        <p className="text-xs text-neutral-500">
          Add another node first to link a branch to it.
        </p>
      )}
    </div>
  );
}
