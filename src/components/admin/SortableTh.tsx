import Link from "next/link";

// Plain server-rendered link, not a client component — sorting just
// navigates to the same admin list with updated ?sort=&dir= params, the
// same way LiveFilterForm drives ?q= on the public list pages.
export function SortableTh({
  basePath,
  field,
  label,
  currentSort,
  currentDir,
  defaultSort,
}: {
  basePath: string;
  field: string;
  label: string;
  currentSort?: string;
  currentDir?: string;
  /** Sort field the list already defaults to when no ?sort= is present. */
  defaultSort: string;
}) {
  const effectiveSort = currentSort ?? defaultSort;
  const effectiveDir = currentDir === "desc" ? "desc" : "asc";
  const isActive = effectiveSort === field;
  const nextDir = isActive && effectiveDir === "asc" ? "desc" : "asc";

  return (
    <th className="py-2">
      <Link
        href={`${basePath}?sort=${field}&dir=${nextDir}`}
        className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white"
      >
        {label}
        {isActive && <span className="text-xs">{effectiveDir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </th>
  );
}
