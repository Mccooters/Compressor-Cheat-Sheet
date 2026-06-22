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
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
        <PageHeader title={tree.title} />
        <Badge tone={tree.status === "published" ? "green" : "neutral"}>
          {tree.status}
        </Badge>
      </div>

      <TreeMetaForm
        action={updateFaultTreeMeta.bind(null, tree.id)}
        initialValues={tree}
        equipmentList={equipmentList}
        selectedEquipmentIds={tree.equipmentLinks.map((l) => l.equipmentId)}
      />

      <Card as="section" className="space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">Validation</h2>
        <LintPanel warnings={warnings} promptById={promptById} />
        {tree.status === "published" ? (
          <form action={unpublishFaultTree.bind(null, tree.id)}>
            <Button type="submit" variant="secondary">
              Unpublish
            </Button>
          </form>
        ) : (
          <form action={publishFaultTree.bind(null, tree.id)}>
            <Button type="submit">Publish</Button>
          </form>
        )}
      </Card>

      <section className="space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Nodes</h2>
        {nodes.map((node) => (
          <Card key={node.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {node.nodeType}
                {tree.rootNodeId === node.id && " · root"}
              </span>
              <div className="flex gap-3 text-xs">
                {tree.rootNodeId !== node.id && (
                  <form action={setRootNode.bind(null, tree.id, node.id)}>
                    <button
                      type="submit"
                      className="text-amber-600 underline dark:text-amber-400"
                    >
                      Set as root
                    </button>
                  </form>
                )}
                <form action={deleteNode.bind(null, node.id, tree.id)}>
                  <button
                    type="submit"
                    className="text-red-600 underline dark:text-red-400"
                  >
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
          </Card>
        ))}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Add node
          </h3>
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
