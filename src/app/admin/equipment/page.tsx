import Link from "next/link";
import { listEquipment } from "@/lib/equipment/queries";
import { DeleteEquipmentButton } from "@/components/equipment/DeleteEquipmentButton";
import { resolvePhotoSrc } from "@/lib/documents/photo";

export default async function AdminEquipmentListPage() {
  const items = await listEquipment({ includeArchived: true });
  const photoSrcs = new Map(
    await Promise.all(
      items.map(async (item) => {
        const photo = item.documents[0];
        return [item.id, photo ? await resolvePhotoSrc(photo) : null] as const;
      })
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage equipment</h1>
        <Link
          href="/admin/equipment/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Add equipment
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="py-2" />
            <th className="py-2">Name</th>
            <th className="py-2">Type</th>
            <th className="py-2">Manufacturer / Model</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const photoSrc = photoSrcs.get(item.id);
            return (
            <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
                  <img
                    src={photoSrc}
                    alt=""
                    className="h-8 w-8 rounded-md border border-neutral-200 object-contain dark:border-neutral-800"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md border border-dashed border-neutral-200 dark:border-neutral-800" />
                )}
              </td>
              <td className="py-2">{item.displayName}</td>
              <td className="py-2 capitalize">{item.type}</td>
              <td className="py-2">
                {item.manufacturer} / {item.modelNumber}
              </td>
              <td className="py-2">{item.status}</td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/equipment/${item.id}/edit`}
                    className="underline"
                  >
                    Edit
                  </Link>
                  <DeleteEquipmentButton
                    equipmentId={item.id}
                    displayName={item.displayName}
                    className="text-red-600 hover:underline"
                  />
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
