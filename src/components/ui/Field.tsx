export const fieldInputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600";

export function Field({
  label,
  helper,
  htmlFor,
  children,
}: {
  label: string;
  helper?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
        {helper ? (
          <span className="ml-1 font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
            — {helper}
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
