const TONE_CLASS: Record<"neutral" | "amber" | "green", string> = {
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  amber:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
  green:
    "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "amber" | "green";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}
