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
