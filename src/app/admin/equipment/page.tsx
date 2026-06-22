import Link from "next/link";
import {
  listEquipment,
  type EquipmentSortField,
} from "@/lib/equipment/queries";
import { AdminEquipmentTable } from "@/components/admin/AdminEquipmentTable";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";

const SORT_FIELDS: EquipmentSortField[] = [
  "displayName",
  "type",
  "manufacturer",
  "status",
];

export default async function AdminEquipmentListPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort, dir } = await searchParams;
  const sortField = SORT_FIELDS.includes(sort as EquipmentSortField)
    ? (sort as EquipmentSortField)
    : undefined;
  const items = await listEquipment({
    includeArchived: true,
    sort: sortField,
    dir: dir === "desc" ? "desc" : "asc",
  });
  const photoSrcs = new Map(
    await Promise.all(
      items.map(async (item) => {
        const photo = item.documents[0];
        return [item.id, photo ? await resolvePhotoSrc(photo) : null] as const;
      })
    )
  );
  const rows = items.map((item) => ({
    id: item.id,
    displayName: item.displayName,
    type: item.type,
    manufacturer: item.manufacturer,
    modelNumber: item.modelNumber,
    status: item.status,
    photoSrc: photoSrcs.get(item.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Manage equipment" />
        <Link href="/admin/equipment/new" className={buttonClass()}>
          Add equipment
        </Link>
      </div>

      <AdminEquipmentTable rows={rows} sort={sort} dir={dir} />
    </div>
  );
}
