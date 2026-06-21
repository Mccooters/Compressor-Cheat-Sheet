"use client";

import { useState, useTransition } from "react";
import {
  addControllerGraphDocumentLink,
  searchControllerSharePointAction,
} from "@/lib/controllers/documentActions";
import type { SharePointHit } from "@/lib/graph/sharepoint";

const docTypeOptions = [
  { value: "photo", label: "Photo" },
  { value: "manual", label: "Manual" },
  { value: "datasheet", label: "Datasheet" },
  { value: "wiring_diagram", label: "Wiring diagram" },
  { value: "parts_list", label: "Parts list" },
  { value: "other", label: "Other" },
] as const;

export function ControllerSharePointPicker({ controllerId }: { controllerId: string }) {
  const [query, setQuery] = useState("");
  const [docType, setDocType] =
    useState<(typeof docTypeOptions)[number]["value"]>("photo");
  const [results, setResults] = useState<SharePointHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      try {
        const hits = await searchControllerSharePointAction(query);
        setResults(hits);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      }
    });
  }

  function handleAdd(hit: SharePointHit) {
    startTransition(async () => {
      await addControllerGraphDocumentLink(controllerId, docType, hit);
      setResults((prev) => prev.filter((h) => h.itemId !== hit.itemId));
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
      <p className="text-xs font-medium text-neutral-500">Search SharePoint</p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="File name or keywords..."
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          value={docType}
          onChange={(e) =>
            setDocType(e.target.value as (typeof docTypeOptions)[number]["value"])
          }
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {docTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isPending}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
        >
          {isPending ? "Working..." : "Search"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((hit) => (
            <li
              key={hit.itemId}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate">{hit.name}</span>
              <button
                type="button"
                onClick={() => handleAdd(hit)}
                disabled={isPending}
                className="ml-3 shrink-0 underline"
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
