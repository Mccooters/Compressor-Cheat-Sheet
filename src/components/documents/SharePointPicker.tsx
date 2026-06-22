"use client";

import { useState, useTransition } from "react";
import {
  addGraphDocumentLink,
  searchSharePointAction,
} from "@/lib/documents/actions";
import type { SharePointHit } from "@/lib/graph/sharepoint";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const docTypeOptions = [
  { value: "manual", label: "Manual" },
  { value: "datasheet", label: "Datasheet" },
  { value: "wiring_diagram", label: "Wiring diagram" },
  { value: "parts_list", label: "Parts list" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
] as const;

export function SharePointPicker({ equipmentId }: { equipmentId: string }) {
  const [query, setQuery] = useState("");
  const [docType, setDocType] =
    useState<(typeof docTypeOptions)[number]["value"]>("manual");
  const [results, setResults] = useState<SharePointHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      try {
        const hits = await searchSharePointAction(query);
        setResults(hits);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      }
    });
  }

  function handleAdd(hit: SharePointHit) {
    startTransition(async () => {
      await addGraphDocumentLink(equipmentId, docType, hit);
      setResults((prev) => prev.filter((h) => h.itemId !== hit.itemId));
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Search SharePoint
      </p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="File name or keywords..."
          className={`flex-1 ${fieldInputClass}`}
        />
        <select
          value={docType}
          onChange={(e) =>
            setDocType(e.target.value as (typeof docTypeOptions)[number]["value"])
          }
          className={fieldInputClass}
        >
          {docTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSearch}
          disabled={isPending}
        >
          {isPending ? "Working..." : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((hit) => (
            <li
              key={hit.itemId}
              className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300"
            >
              <span className="truncate">{hit.name}</span>
              <button
                type="button"
                onClick={() => handleAdd(hit)}
                disabled={isPending}
                className="ml-3 shrink-0 text-amber-600 underline dark:text-amber-400"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
