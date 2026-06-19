"use client";

import { useState } from "react";

type EquipmentSummary = { id: string; displayName: string };
type DocSummary = { id: string; title: string; equipmentId: string | null };
type NodeType = "question" | "diagnosis";

export function NodeForm({
  action,
  initialValues,
  equipmentList,
  documents,
  submitLabel = "Save",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: {
    nodeType: NodeType;
    prompt: string;
    probableCause?: string | null;
    recommendedFix?: string | null;
    safetyWarning?: string | null;
    linkedEquipmentId?: string | null;
    linkedDocumentId?: string | null;
  };
  equipmentList: EquipmentSummary[];
  documents: DocSummary[];
  submitLabel?: string;
}) {
  const [nodeType, setNodeType] = useState<NodeType>(
    initialValues?.nodeType ?? "question"
  );
  const [linkedEquipmentId, setLinkedEquipmentId] = useState(
    initialValues?.linkedEquipmentId ?? ""
  );
  const filteredDocs = documents.filter(
    (d) => !linkedEquipmentId || d.equipmentId === linkedEquipmentId
  );

  return (
    <form
      action={action}
      className="space-y-3 rounded-md bg-neutral-50 p-3 dark:bg-neutral-900/50"
    >
      <div className="flex gap-3">
        <select
          name="nodeType"
          value={nodeType}
          onChange={(e) => setNodeType(e.target.value as NodeType)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="question">Question</option>
          <option value="diagnosis">Diagnosis</option>
        </select>
        <input
          name="prompt"
          required
          placeholder={nodeType === "question" ? "Question text" : "Short label"}
          defaultValue={initialValues?.prompt}
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {nodeType === "diagnosis" && (
        <div className="space-y-2">
          <textarea
            name="probableCause"
            placeholder="Probable cause"
            rows={2}
            defaultValue={initialValues?.probableCause ?? ""}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <textarea
            name="recommendedFix"
            placeholder="Recommended fix"
            rows={2}
            defaultValue={initialValues?.recommendedFix ?? ""}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <textarea
            name="safetyWarning"
            placeholder="Safety warning (optional)"
            rows={1}
            defaultValue={initialValues?.safetyWarning ?? ""}
            className="w-full rounded-md border border-red-300 px-2 py-1 text-sm dark:border-red-800 dark:bg-neutral-900"
          />
          <div className="flex gap-2">
            <select
              name="linkedEquipmentId"
              value={linkedEquipmentId}
              onChange={(e) => setLinkedEquipmentId(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">No linked equipment</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.displayName}
                </option>
              ))}
            </select>
            <select
              name="linkedDocumentId"
              defaultValue={initialValues?.linkedDocumentId ?? ""}
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">No linked manual</option>
              {filteredDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="rounded-md border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}
