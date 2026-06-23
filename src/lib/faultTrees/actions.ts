"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  faultTree,
  faultTreeBranch,
  faultTreeEquipment,
  faultTreeNode,
} from "@/db/schema";
import { getCurrentUserEmail } from "@/lib/auth/currentUser";
import { EQUIPMENT_TYPES } from "@/lib/equipment/specSchemas";
import { canPublish, lintFaultTree } from "@/lib/faultTrees/lint";
import { getTreeWithNodes } from "@/lib/faultTrees/queries";

const FAULT_TREE_CATEGORIES = [
  "electrical",
  "mechanical",
  "lubrication",
  "controls",
  "safety",
  "moisture",
] as const;

const treeMetaSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(FAULT_TREE_CATEGORIES),
  equipmentScope: z.enum(["generic", "type_scoped", "model_scoped"]),
  scopedEquipmentType: z.enum(EQUIPMENT_TYPES).optional(),
});

export async function createFaultTree(formData: FormData) {
  const values = treeMetaSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || "mechanical",
    equipmentScope: formData.get("equipmentScope") || "generic",
    scopedEquipmentType: formData.get("scopedEquipmentType") || undefined,
  });
  const userEmail = await getCurrentUserEmail();

  const [created] = await db
    .insert(faultTree)
    .values({ ...values, createdBy: userEmail ?? undefined })
    .returning({ id: faultTree.id });

  revalidatePath("/admin/fault-trees");
  redirect(`/admin/fault-trees/${created.id}/edit`);
}

export async function updateFaultTreeMeta(id: string, formData: FormData) {
  const values = treeMetaSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || "mechanical",
    equipmentScope: formData.get("equipmentScope") || "generic",
    scopedEquipmentType: formData.get("scopedEquipmentType") || undefined,
  });
  const equipmentIds = formData.getAll("equipmentIds").map(String);

  await db
    .update(faultTree)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(faultTree.id, id));

  await db.delete(faultTreeEquipment).where(eq(faultTreeEquipment.faultTreeId, id));
  if (values.equipmentScope === "model_scoped" && equipmentIds.length > 0) {
    await db
      .insert(faultTreeEquipment)
      .values(equipmentIds.map((equipmentId) => ({ faultTreeId: id, equipmentId })));
  }

  revalidatePath(`/admin/fault-trees/${id}/edit`);
}

export async function deleteFaultTree(id: string) {
  await db.delete(faultTree).where(eq(faultTree.id, id));
  revalidatePath("/admin/fault-trees");
  redirect("/admin/fault-trees");
}

const nodeSchema = z.object({
  nodeType: z.enum(["question", "diagnosis"]),
  prompt: z.string().min(1, "Prompt is required"),
  probableCause: z.string().optional(),
  recommendedFix: z.string().optional(),
  safetyWarning: z.string().optional(),
  linkedEquipmentId: z.string().uuid().optional().or(z.literal("")),
  linkedDocumentId: z.string().uuid().optional().or(z.literal("")),
});

function parseNodeFormData(formData: FormData) {
  const values = nodeSchema.parse({
    nodeType: formData.get("nodeType"),
    prompt: formData.get("prompt"),
    probableCause: formData.get("probableCause") || undefined,
    recommendedFix: formData.get("recommendedFix") || undefined,
    safetyWarning: formData.get("safetyWarning") || undefined,
    linkedEquipmentId: formData.get("linkedEquipmentId") || undefined,
    linkedDocumentId: formData.get("linkedDocumentId") || undefined,
  });
  return {
    ...values,
    linkedEquipmentId: values.linkedEquipmentId || null,
    linkedDocumentId: values.linkedDocumentId || null,
  };
}

export async function createNode(faultTreeId: string, formData: FormData) {
  const values = parseNodeFormData(formData);

  await db.insert(faultTreeNode).values({ ...values, faultTreeId });

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
}

export async function updateNode(
  nodeId: string,
  faultTreeId: string,
  formData: FormData
) {
  const values = parseNodeFormData(formData);

  await db
    .update(faultTreeNode)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(faultTreeNode.id, nodeId));

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
}

export async function deleteNode(nodeId: string, faultTreeId: string) {
  await db.delete(faultTreeNode).where(eq(faultTreeNode.id, nodeId));

  const tree = await db.query.faultTree.findFirst({
    where: eq(faultTree.id, faultTreeId),
  });
  if (tree?.rootNodeId === nodeId) {
    await db
      .update(faultTree)
      .set({ rootNodeId: null })
      .where(eq(faultTree.id, faultTreeId));
  }

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
}

export async function setRootNode(faultTreeId: string, nodeId: string) {
  await db
    .update(faultTree)
    .set({ rootNodeId: nodeId, updatedAt: new Date() })
    .where(eq(faultTree.id, faultTreeId));

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
}

const branchSchema = z.object({
  label: z.string().min(1, "Label is required"),
  toNodeId: z.string().uuid("Choose a destination node"),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createBranch(
  fromNodeId: string,
  faultTreeId: string,
  formData: FormData
) {
  const values = branchSchema.parse({
    label: formData.get("label"),
    toNodeId: formData.get("toNodeId"),
    sortOrder: formData.get("sortOrder") || 0,
  });

  await db.insert(faultTreeBranch).values({ ...values, fromNodeId });

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
}

export async function deleteBranch(branchId: string, faultTreeId: string) {
  await db.delete(faultTreeBranch).where(eq(faultTreeBranch.id, branchId));
  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
}

export async function publishFaultTree(faultTreeId: string) {
  const result = await getTreeWithNodes(faultTreeId);
  if (!result) return;

  const warnings = lintFaultTree(result.tree, result.nodes);
  if (!canPublish(warnings)) {
    throw new Error(
      "Cannot publish: this fault tree has no root node set yet."
    );
  }

  await db
    .update(faultTree)
    .set({ status: "published", updatedAt: new Date() })
    .where(eq(faultTree.id, faultTreeId));

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
  revalidatePath("/wizard");
}

export async function unpublishFaultTree(faultTreeId: string) {
  await db
    .update(faultTree)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(faultTree.id, faultTreeId));

  revalidatePath(`/admin/fault-trees/${faultTreeId}/edit`);
  revalidatePath("/wizard");
}
