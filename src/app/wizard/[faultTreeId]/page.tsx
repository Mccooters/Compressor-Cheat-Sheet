import { notFound } from "next/navigation";
import { getTreeWithNodes } from "@/lib/faultTrees/queries";
import { WizardClient } from "./WizardClient";

export default async function WizardTraversalPage({
  params,
}: {
  params: Promise<{ faultTreeId: string }>;
}) {
  const { faultTreeId } = await params;
  const result = await getTreeWithNodes(faultTreeId);
  if (!result || result.tree.status !== "published") notFound();

  return <WizardClient tree={result.tree} nodes={result.nodes} />;
}
