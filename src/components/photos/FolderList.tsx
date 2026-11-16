"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { linkCardClass } from "@/components/ui/Card";
import { fieldInputClass } from "@/components/ui/Field";

export type FolderEntry = { id: string; name: string; modified: string | null };

/** The job folders, with a box that narrows them as you type. */
export function FolderList({ folders }: { folders: FolderEntry[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return folders;
    return folders.filter((folder) => {
      const name = folder.name.toLowerCase();
      return words.every((word) => name.includes(word));
    });
  }, [folders, query]);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Find a job
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Job number, client or name"
          className={fieldInputClass}
        />
      </label>
      <p className="text-sm text-slate-500 dark:text-slate-400" role="status">
        {shown.length === folders.length
          ? `${folders.length} folders, most recently changed first`
          : `${shown.length} of ${folders.length} folders`}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((folder) => (
          <li key={folder.id}>
            <Link href={`/photos/${folder.id}`} className={linkCardClass("block p-4")}>
              <span className="block font-medium text-slate-900 dark:text-white">{folder.name}</span>
              {folder.modified && (
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  Changed {folder.modified}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
