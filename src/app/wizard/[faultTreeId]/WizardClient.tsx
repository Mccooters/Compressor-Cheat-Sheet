"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type Branch = { id: string; label: string; toNodeId: string };
type LinkedEquipment = { id: string; displayName: string } | null;
type LinkedDocument = { id: string; title: string; webUrl: string } | null;

export type WizardNode = {
  id: string;
  nodeType: "question" | "diagnosis";
  prompt: string;
  probableCause: string | null;
  recommendedFix: string | null;
  safetyWarning: string | null;
  linkedEquipment: LinkedEquipment;
  linkedDocument: LinkedDocument;
  outgoingBranches: Branch[];
};

export function WizardClient({
  tree,
  nodes,
}: {
  tree: { id: string; title: string; rootNodeId: string | null };
  nodes: WizardNode[];
}) {
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const [history, setHistory] = useState<string[]>(
    tree.rootNodeId ? [tree.rootNodeId] : []
  );

  const currentNodeId = history[history.length - 1];
  const currentNode = currentNodeId ? nodesById.get(currentNodeId) : undefined;

  function goTo(nodeId: string) {
    setHistory((h) => [...h, nodeId]);
  }

  function goBack() {
    setHistory((h) => h.slice(0, -1));
  }

  function startOver() {
    setHistory(tree.rootNodeId ? [tree.rootNodeId] : []);
  }

  if (!currentNode) {
    return <EmptyState>This fault tree has no starting question configured yet.</EmptyState>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {tree.title}
        </h1>
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          Step {history.length}
        </span>
      </div>

      {currentNode.nodeType === "question" ? (
        <Card className="space-y-4">
          <p className="text-lg text-slate-900 dark:text-white">{currentNode.prompt}</p>
          <div className="flex flex-col gap-2">
            {currentNode.outgoingBranches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => goTo(branch.toNodeId)}
                className="rounded-md border border-slate-300 px-4 py-2 text-left text-slate-700 transition hover:border-orange-400 hover:bg-orange-50 dark:border-zinc-700 dark:text-slate-300 dark:hover:border-orange-500/60 dark:hover:bg-orange-500/10"
              >
                {branch.label}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-4 rounded-xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {currentNode.prompt}
          </h2>

          {currentNode.safetyWarning && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              ⚠ {currentNode.safetyWarning}
            </div>
          )}

          {currentNode.probableCause && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Probable cause
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                {currentNode.probableCause}
              </p>
            </div>
          )}

          {currentNode.recommendedFix && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Recommended fix
              </h3>
              <p className="text-slate-700 dark:text-slate-300">
                {currentNode.recommendedFix}
              </p>
            </div>
          )}

          {(currentNode.linkedDocument || currentNode.linkedEquipment) && (
            <div className="flex gap-4 text-sm">
              {currentNode.linkedDocument && (
                <a
                  href={currentNode.linkedDocument.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 underline dark:text-orange-400"
                >
                  View manual: {currentNode.linkedDocument.title}
                </a>
              )}
              {currentNode.linkedEquipment && (
                <Link
                  href={`/equipment/${currentNode.linkedEquipment.id}`}
                  className="text-orange-600 underline dark:text-orange-400"
                >
                  View {currentNode.linkedEquipment.displayName}
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {history.length > 1 && (
          <Button variant="secondary" onClick={goBack}>
            Back
          </Button>
        )}
        <Button variant="secondary" onClick={startOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}
