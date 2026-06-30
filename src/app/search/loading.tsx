export default function Loading() {
  const block = "rounded bg-slate-200 dark:bg-zinc-700";
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-8">
      <div className={`h-7 w-32 ${block}`} />
      <div className={`h-10 w-full ${block}`} />
      <div className="space-y-3">
        <div className={`h-5 w-40 ${block}`} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`h-12 ${block}`} />
        ))}
      </div>
    </div>
  );
}
