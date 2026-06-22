export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}
