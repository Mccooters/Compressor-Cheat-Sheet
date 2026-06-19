"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
    return (
      <p className="text-neutral-500">
        This fault tree has no starting question configured yet.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{tree.title}</h1>
        <span className="text-sm text-neutral-500">Step {history.length}</span>
      </div>

      {currentNode.nodeType === "question" ? (
        <div className="space-y-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
          <p className="text-lg">{currentNode.prompt}</p>
          <div className="flex flex-col gap-2">
            {currentNode.outgoingBranches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => goTo(branch.toNodeId)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-left hover:border-blue-500 hover:bg-blue-50 dark:border-neutral-700 dark:hover:bg-blue-950"
              >
                {branch.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950">
          <h2 className="text-lg font-semibold">{currentNode.prompt}</h2>

          {currentNode.safetyWarning && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              ⚠ {currentNode.safetyWarning}
            </div>
          )}

          {currentNode.probableCause && (
            <div>
              <h3 className="text-sm font-medium text-neutral-500">
                Probable cause
              </h3>
              <p>{currentNode.probableCause}</p>
            </div>
          )}

          {currentNode.recommendedFix && (
            <div>
              <h3 className="text-sm font-medium text-neutral-500">
                Recommended fix
              </h3>
              <p>{currentNode.recommendedFix}</p>
            </div>
          )}

          {(currentNode.linkedDocument || currentNode.linkedEquipment) && (
            <div className="flex gap-4 text-sm">
              {currentNode.linkedDocument && (
                <a
                  href={currentNode.linkedDocument.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View manual: {currentNode.linkedDocument.title}
                </a>
              )}
              {currentNode.linkedEquipment && (
                <Link
                  href={`/equipment/${currentNode.linkedEquipment.id}`}
                  className="underline"
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
          <button
            onClick={goBack}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            Back
          </button>
        )}
        <button
          onClick={startOver}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
