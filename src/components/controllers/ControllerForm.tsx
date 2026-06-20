export type ControllerFormValues = {
  manufacturer: string;
  modelName: string;
  displayName: string;
  notes?: string | null;
};

export function ControllerForm({
  action,
  initialValues,
  submitLabel = "Save",
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: ControllerFormValues;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="max-w-xl space-y-4">
      <Field label="Manufacturer">
        <input
          name="manufacturer"
          required
          defaultValue={initialValues?.manufacturer}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <Field label="Model name">
        <input
          name="modelName"
          required
          defaultValue={initialValues?.modelName}
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

      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </Field>

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
