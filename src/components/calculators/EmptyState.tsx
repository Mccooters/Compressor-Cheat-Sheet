export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-2 text-center text-sm text-slate-500 dark:text-slate-500">
      {children}
    </p>
  );
}
