import { useId } from "react";

export function NumberField({
  label,
  unit,
  helper,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit?: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
        {helper ? (
          <span className="ml-1 font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
            — {helper}
          </span>
        ) : null}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
        />
        {unit ? (
          <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}
