"use client";

import { useState } from "react";
import {
  EQUIPMENT_TYPES,
  specFieldsByType,
  type EquipmentType,
} from "@/lib/equipment/specSchemas";

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
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Manufacturer">
        <input
          name="manufacturer"
          required
          defaultValue={initialValues?.manufacturer}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <Field label="Model number">
        <input
          name="modelNumber"
          required
          defaultValue={initialValues?.modelNumber}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <Field label="Display name">
        <input
          name="displayName"
          required
          defaultValue={initialValues?.displayName}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          defaultValue={initialValues?.description ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <fieldset className="space-y-3 rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
        <legend className="px-1 text-sm font-medium capitalize">
          {type} specs
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
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
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
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              />
            )}
          </Field>
        ))}
      </fieldset>

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
