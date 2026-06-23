/** Shared styling for a clickable card linking to a detail page — pass padding/layout utilities in className (e.g. "p-3 flex items-center gap-3"). */
export function linkCardClass(className = "") {
  return `rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60 ${className}`;
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "form";
} & Record<string, unknown>) {
  return (
    <Tag
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-6 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
