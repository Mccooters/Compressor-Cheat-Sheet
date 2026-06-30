import { Field, fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
          className={fieldInputClass}
        />
      </Field>

      <Field label="Model name">
        <input
          name="modelName"
          required
          defaultValue={initialValues?.modelName}
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

      <Field
        label="Notes"
        helper="Use this field for reset instructions, wiring notes, or any other controller-specific information."
      >
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          className={fieldInputClass}
        />
      </Field>

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
