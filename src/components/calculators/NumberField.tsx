import { useId } from "react";

export function NumberField({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {unit ? ` (${unit})` : ""}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      />
    </div>
  );
}
