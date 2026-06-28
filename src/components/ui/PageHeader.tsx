export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          {eyebrow}
        </p>
      ) : null}
      <h1 className={`text-2xl font-bold tracking-tight text-slate-900 dark:text-white ${eyebrow ? "mt-1" : ""}`}>
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
