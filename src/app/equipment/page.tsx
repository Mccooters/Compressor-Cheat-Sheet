import Link from "next/link";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { LiveFilterForm } from "@/components/search/LiveFilterForm";
import { listEquipment } from "@/lib/equipment/queries";
import { EQUIPMENT_TYPES, type EquipmentType } from "@/lib/equipment/specSchemas";

export default async function EquipmentListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  const validType = EQUIPMENT_TYPES.includes(type as EquipmentType)
    ? (type as EquipmentType)
    : undefined;

  const results = await listEquipment({ q, type: validType });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Equipment</h1>
        <Link
          href="/admin/equipment/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Add equipment
        </Link>
      </div>

      <LiveFilterForm>
        <input
          type="search"
          name="q"
          placeholder="Search manufacturer, model, name..."
          defaultValue={q}
          className="min-w-64 flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="type"
          defaultValue={validType ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">All types</option>
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </LiveFilterForm>

      {results.length === 0 ? (
        <p className="text-neutral-500">No equipment found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((item) => (
            <EquipmentCard key={item.id} equipment={item} />
          ))}
        </div>
      )}
    </div>
  );
}
