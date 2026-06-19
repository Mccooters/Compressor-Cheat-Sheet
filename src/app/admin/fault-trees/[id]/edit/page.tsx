import { notFound } from "next/navigation";
import { BranchManager } from "@/components/faultTrees/BranchManager";
import { LintPanel } from "@/components/faultTrees/LintPanel";
import { NodeForm } from "@/components/faultTrees/NodeForm";
import { TreeMetaForm } from "@/components/faultTrees/TreeMetaForm";
import { listAllDocumentLinks } from "@/lib/documents/queries";
import { listActiveEquipmentSummaries } from "@/lib/equipment/queries";
import {
  createNode,
  deleteNode,
  publishFaultTree,
  setRootNode,
  unpublishFaultTree,
  updateFaultTreeMeta,
  updateNode,
} from "@/lib/faultTrees/actions";
import { lintFaultTree } from "@/lib/faultTrees/lint";
import { getTreeWithNodes } from "@/lib/faultTrees/queries";

export default async function EditFaultTreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, equipmentList, documents] = await Promise.all([
    getTreeWithNodes(id),
    listActiveEquipmentSummaries(),
    listAllDocumentLinks(),
  ]);
  if (!result) notFound();
  const { tree, nodes } = result;

  const warnings = lintFaultTree(tree, nodes);
  const promptById = new Map(nodes.map((n) => [n.id, n.prompt]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tree.title}</h1>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            tree.status === "published"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
              : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {tree.status}
        </span>
      </div>

      <TreeMetaForm
        action={updateFaultTreeMeta.bind(null, tree.id)}
        initialValues={tree}
        equipmentList={equipmentList}
        selectedEquipmentIds={tree.equipmentLinks.map((l) => l.equipmentId)}
      />

      <section className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Validation</h2>
        <LintPanel warnings={warnings} promptById={promptById} />
        {tree.status === "published" ? (
          <form action={unpublishFaultTree.bind(null, tree.id)}>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
            >
              Unpublish
            </button>
          </form>
        ) : (
          <form action={publishFaultTree.bind(null, tree.id)}>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Publish
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Nodes</h2>
        {nodes.map((node) => (
          <div
            key={node.id}
            className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-neutral-500">
                {node.nodeType}
                {tree.rootNodeId === node.id && " · root"}
              </span>
              <div className="flex gap-3 text-xs">
                {tree.rootNodeId !== node.id && (
                  <form action={setRootNode.bind(null, tree.id, node.id)}>
                    <button type="submit" className="underline">
                      Set as root
                    </button>
                  </form>
                )}
                <form action={deleteNode.bind(null, node.id, tree.id)}>
                  <button type="submit" className="text-red-600 underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <NodeForm
              action={updateNode.bind(null, node.id, tree.id)}
              initialValues={node}
              equipmentList={equipmentList}
              documents={documents}
            />
            {node.nodeType === "question" && (
              <BranchManager faultTreeId={tree.id} node={node} allNodes={nodes} />
            )}
          </div>
        ))}

        <div>
          <h3 className="mb-2 text-sm font-medium text-neutral-500">Add node</h3>
          <NodeForm
            action={createNode.bind(null, tree.id)}
            equipmentList={equipmentList}
            documents={documents}
            submitLabel="Add node"
          />
        </div>
      </section>
    </div>
  );
}
