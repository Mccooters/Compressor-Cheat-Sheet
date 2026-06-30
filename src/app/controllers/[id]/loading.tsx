export default function Loading() {
  const block = "rounded bg-slate-200 dark:bg-zinc-700";
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-8">
      <div className="flex items-start gap-4">
        <div className={`h-32 w-32 shrink-0 ${block}`} />
        <div className="space-y-2">
          <div className={`h-3 w-24 ${block}`} />
          <div className={`h-7 w-48 ${block}`} />
        </div>
      </div>
      <div className="space-y-3">
        <div className={`h-5 w-32 ${block}`} />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`h-12 ${block}`} />
        ))}
      </div>
    </div>
  );
}
