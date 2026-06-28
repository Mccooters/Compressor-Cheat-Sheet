"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { SortableTh } from "@/components/admin/SortableTh";
import { DeleteEquipmentButton } from "@/components/equipment/DeleteEquipmentButton";
import { formatEquipmentTypeLabel } from "@/lib/equipment/specSchemas";
import { deleteManyEquipment } from "@/lib/equipment/actions";
import { Button } from "@/components/ui/Button";

type Row = {
  id: string;
  displayName: string;
  type: string;
  manufacturer: string;
  modelNumber: string;
  status: string;
  photoSrc: string | null;
};

export function AdminEquipmentTable({
  rows,
  sort,
  dir,
}: {
  rows: Row[];
  sort?: string;
  dir?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (
      !window.confirm(
        `Delete ${ids.length} item${ids.length === 1 ? "" : "s"}? This cannot be undone and will also remove any attached document links.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteManyEquipment(ids);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-950">
          <span className="text-red-800 dark:text-red-200">
            {selected.size} selected
          </span>
          <Button
            type="button"
            variant="danger"
            onClick={handleDeleteSelected}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete selected"}
          </Button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-zinc-800 dark:text-slate-400">
            <th className="py-2 pr-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
                className="accent-orange-500"
              />
            </th>
            <th className="py-2" />
            <SortableTh
              basePath="/admin/equipment"
              field="displayName"
              label="Name"
              currentSort={sort}
              currentDir={dir}
              defaultSort="manufacturer"
            />
            <SortableTh
              basePath="/admin/equipment"
              field="type"
              label="Type"
              currentSort={sort}
              currentDir={dir}
              defaultSort="manufacturer"
            />
            <SortableTh
              basePath="/admin/equipment"
              field="manufacturer"
              label="Manufacturer / Model"
              currentSort={sort}
              currentDir={dir}
              defaultSort="manufacturer"
            />
            <SortableTh
              basePath="/admin/equipment"
              field="status"
              label="Status"
              currentSort={sort}
              currentDir={dir}
              defaultSort="manufacturer"
            />
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 dark:border-zinc-900"
            >
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleOne(item.id)}
                  aria-label={`Select ${item.displayName}`}
                  className="accent-orange-500"
                />
              </td>
              <td className="py-2">
                {item.photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
                  <img
                    src={item.photoSrc}
                    alt=""
                    className="h-8 w-8 rounded-md border border-slate-200 object-contain dark:border-zinc-700"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md border border-dashed border-slate-200 dark:border-zinc-700" />
                )}
              </td>
              <td className="py-2 text-slate-900 dark:text-white">
                {item.displayName}
              </td>
              <td className="py-2 capitalize text-slate-700 dark:text-slate-300">
                {formatEquipmentTypeLabel(item.type)}
              </td>
              <td className="py-2 text-slate-700 dark:text-slate-300">
                {item.manufacturer} / {item.modelNumber}
              </td>
              <td className="py-2 text-slate-700 dark:text-slate-300">{item.status}</td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/equipment/${item.id}/edit`}
                    className="text-orange-600 underline dark:text-orange-400"
                  >
                    Edit
                  </Link>
                  <DeleteEquipmentButton
                    equipmentId={item.id}
                    displayName={item.displayName}
                    className="text-red-600 hover:underline dark:text-red-400"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
