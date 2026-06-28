"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchAllAction } from "@/lib/search/actions";

type SearchResults = Awaited<ReturnType<typeof searchAllAction>>;

type ResultItem = {
  id: string;
  href: string;
  title: string;
  sub?: string;
  external?: boolean;
};

function buildGroups(results: SearchResults): { label: string; items: ResultItem[] }[] {
  return [
    {
      label: "Equipment",
      items: results.equipment.map((item) => ({
        id: item.id,
        href: `/equipment/${item.id}`,
        title: item.displayName,
        sub: `${item.manufacturer} · ${item.modelNumber}`,
      })),
    },
    {
      label: "Controllers",
      items: results.controllers.map((item) => ({
        id: item.id,
        href: `/controllers/${item.id}`,
        title: item.displayName,
        sub: `${item.manufacturer} · ${item.modelName}`,
      })),
    },
    {
      label: "Fault trees",
      items: results.faultTrees.map((item) => ({
        id: item.id,
        href: `/wizard/${item.id}`,
        title: item.title,
        sub: item.description ?? undefined,
      })),
    },
    {
      label: "SWMS",
      items: results.swms.map((item) => ({
        id: item.id,
        href: item.source === "graph" ? `/api/resources/${item.id}/pdf` : item.webUrl,
        title: item.title,
        external: true,
      })),
    },
  ].filter((group) => group.items.length > 0);
}

export function NavSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Reset on navigation (this component lives in the root layout, so it
  // doesn't unmount between pages) — adjusted during render, not in an
  // effect, per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(async () => {
      const data = await searchAllAction(query);
      setResults(data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  function goToFullResults() {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  const groups = results ? buildGroups(results) : [];
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div ref={ref} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) goToFullResults();
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder:text-slate-600"
        />
      </form>

      {open && query.trim() && (
        <div className="absolute inset-x-0 z-20 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0 sm:w-96 dark:border-zinc-700 dark:bg-zinc-900">
          {!results ? (
            <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">Searching…</p>
          ) : totalCount === 0 ? (
            <p className="px-1 py-2 text-sm text-slate-500 dark:text-slate-400">No matches.</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.slice(0, 5).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          target={item.external ? "_blank" : undefined}
                          rel={item.external ? "noopener noreferrer" : undefined}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
                        >
                          <span className="font-medium text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          {item.sub && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {item.sub}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <button
                type="button"
                onClick={goToFullResults}
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-orange-600 hover:bg-slate-100 dark:text-orange-400 dark:hover:bg-zinc-800"
              >
                See all results →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
