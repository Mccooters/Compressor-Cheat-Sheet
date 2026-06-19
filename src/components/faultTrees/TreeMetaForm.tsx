"use client";

import { useState } from "react";
import { EQUIPMENT_TYPES } from "@/lib/equipment/specSchemas";

type EquipmentSummary = { id: string; displayName: string };
type Scope = "generic" | "type_scoped" | "model_scoped";

export function TreeMetaForm({
  action,
  initialValues,
  equipmentList,
  selectedEquipmentIds,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues: {
    title: string;
    description?: string | null;
    equipmentScope: Scope;
    scopedEquipmentType?: string | null;
  };
  equipmentList: EquipmentSummary[];
  selectedEquipmentIds: string[];
}) {
  const [scope, setScope] = useState<Scope>(initialValues.equipmentScope);

  return (
    <form
      action={action}
      className="max-w-xl space-y-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          defaultValue={initialValues.title}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={initialValues.description ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Applies to</label>
        <select
          name="equipmentScope"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="generic">Any equipment (generic)</option>
          <option value="type_scoped">All equipment of one type</option>
          <option value="model_scoped">Specific equipment</option>
        </select>
      </div>

      {scope === "type_scoped" && (
        <div>
          <label className="block text-sm font-medium">Equipment type</label>
          <select
            name="scopedEquipmentType"
            defaultValue={initialValues.scopedEquipmentType ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {scope === "model_scoped" && (
        <div>
          <label className="block text-sm font-medium">Equipment</label>
          <select
            name="equipmentIds"
            multiple
            defaultValue={selectedEquipmentIds}
            className="mt-1 h-40 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.displayName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            Cmd/Ctrl-click to select multiple.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Save
      </button>
    </form>
  );
}
