"use client";

import { useState } from "react";
import {
  EQUIPMENT_TYPES,
  formatEquipmentTypeLabel,
  specFieldsByType,
  type EquipmentType,
} from "@/lib/equipment/specSchemas";
import { Field, fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export type EquipmentFormValues = {
  type: EquipmentType;
  manufacturer: string;
  modelNumber: string;
  displayName: string;
  description?: string | null;
  specs?: Record<string, unknown>;
};

export function EquipmentForm({
  action,
  initialValues,
  submitLabel = "Save",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: EquipmentFormValues;
  submitLabel?: string;
}) {
  const [type, setType] = useState<EquipmentType>(
    initialValues?.type ?? "compressor"
  );
  const fields = specFieldsByType[type];

  return (
    <form action={action} className="max-w-xl space-y-4">
      <Field label="Type">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as EquipmentType)}
          className={fieldInputClass}
        >
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {formatEquipmentTypeLabel(t)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Manufacturer">
        <input
          name="manufacturer"
          required
          defaultValue={initialValues?.manufacturer}
          className={fieldInputClass}
        />
      </Field>

      <Field label="Model number">
        <input
          name="modelNumber"
          required
          defaultValue={initialValues?.modelNumber}
          className={fieldInputClass}
        />
      </Field>

      <Field label="Display name">
        <input
          name="displayName"
          required
          defaultValue={initialValues?.displayName}
          className={fieldInputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          defaultValue={initialValues?.description ?? ""}
          className={fieldInputClass}
        />
      </Field>

      <fieldset className="space-y-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500 capitalize dark:text-slate-400">
          {formatEquipmentTypeLabel(type)} specs
        </legend>
        {fields.map((f) => (
          <Field
            key={f.key}
            label={f.unit ? `${f.label} (${f.unit})` : f.label}
          >
            {f.kind === "select" ? (
              <select
                name={`spec_${f.key}`}
                defaultValue={String(initialValues?.specs?.[f.key] ?? "")}
                className={fieldInputClass}
              >
                <option value="">—</option>
                {f.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={`spec_${f.key}`}
                type={f.kind === "number" ? "number" : "text"}
                defaultValue={String(initialValues?.specs?.[f.key] ?? "")}
                className={fieldInputClass}
              />
            )}
          </Field>
        ))}
      </fieldset>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
