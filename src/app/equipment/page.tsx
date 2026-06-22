import Link from "next/link";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { LiveFilterForm } from "@/components/search/LiveFilterForm";
import { listEquipment } from "@/lib/equipment/queries";
import {
  EQUIPMENT_TYPES,
  formatEquipmentTypeLabel,
  type EquipmentType,
} from "@/lib/equipment/specSchemas";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/components/ui/Field";
import { buttonClass } from "@/components/ui/Button";

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
  const photoSrcs = new Map(
    await Promise.all(
      results.map(async (item) => {
        const photo = item.documents[0];
        return [item.id, photo ? await resolvePhotoSrc(photo) : null] as const;
      })
    )
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Equipment" />
        <Link href="/admin/equipment/new" className={buttonClass()}>
          Add equipment
        </Link>
      </div>

      <LiveFilterForm>
        <input
          type="search"
          name="q"
          placeholder="Search manufacturer, model, name..."
          defaultValue={q}
          className={`min-w-64 flex-1 ${fieldInputClass}`}
        />
        <select name="type" defaultValue={validType ?? ""} className={fieldInputClass}>
          <option value="">All types</option>
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {formatEquipmentTypeLabel(t)}
            </option>
          ))}
        </select>
      </LiveFilterForm>

      {results.length === 0 ? (
        <EmptyState>No equipment found.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              photoSrc={photoSrcs.get(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
