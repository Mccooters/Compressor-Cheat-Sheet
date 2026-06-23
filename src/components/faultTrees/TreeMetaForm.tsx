"use client";

import { useState } from "react";
import { EQUIPMENT_TYPES, formatEquipmentTypeLabel } from "@/lib/equipment/specSchemas";
import { Field, fieldInputClass } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type EquipmentSummary = { id: string; displayName: string };
type Scope = "generic" | "type_scoped" | "model_scoped";
type Category =
  | "electrical"
  | "mechanical"
  | "lubrication"
  | "controls"
  | "safety"
  | "moisture";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "electrical", label: "Electrical" },
  { value: "mechanical", label: "Mechanical" },
  { value: "lubrication", label: "Lubrication & Cooling" },
  { value: "controls", label: "Controls & Cycling" },
  { value: "safety", label: "Safety & Pressure Relief" },
  { value: "moisture", label: "Moisture & Drainage" },
];

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
    category: Category;
    equipmentScope: Scope;
    scopedEquipmentType?: string | null;
  };
  equipmentList: EquipmentSummary[];
  selectedEquipmentIds: string[];
}) {
  const [scope, setScope] = useState<Scope>(initialValues.equipmentScope);

  return (
    <Card as="form" action={action} className="max-w-xl space-y-4">
      <Field label="Title">
        <input
          name="title"
          required
          defaultValue={initialValues.title}
          className={fieldInputClass}
        />
      </Field>
      <Field label="Description">
        <textarea
          name="description"
          rows={2}
          defaultValue={initialValues.description ?? ""}
          className={fieldInputClass}
        />
      </Field>
      <Field label="Category" helper="Where this shows up on the Fault Finder">
        <select
          name="category"
          defaultValue={initialValues.category}
          className={fieldInputClass}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Applies to">
        <select
          name="equipmentScope"
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className={fieldInputClass}
        >
          <option value="generic">Any equipment (generic)</option>
          <option value="type_scoped">All equipment of one type</option>
          <option value="model_scoped">Specific equipment</option>
        </select>
      </Field>

      {scope === "type_scoped" && (
        <Field label="Equipment type">
          <select
            name="scopedEquipmentType"
            defaultValue={initialValues.scopedEquipmentType ?? ""}
            className={fieldInputClass}
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEquipmentTypeLabel(t)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {scope === "model_scoped" && (
        <Field label="Equipment" helper="Cmd/Ctrl-click to select multiple">
          <select
            name="equipmentIds"
            multiple
            defaultValue={selectedEquipmentIds}
            className={`h-40 ${fieldInputClass}`}
          >
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.displayName}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Button type="submit">Save</Button>
    </Card>
  );
}
