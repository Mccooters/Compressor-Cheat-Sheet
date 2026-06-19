import { notFound } from "next/navigation";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { DocumentLinksPanel } from "@/components/documents/DocumentLinksPanel";
import { archiveEquipment, updateEquipment } from "@/lib/equipment/actions";
import { getEquipmentById } from "@/lib/equipment/queries";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getEquipmentById(id);
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit {item.displayName}</h1>
        <form action={archiveEquipment.bind(null, item.id)}>
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
          >
            Archive
          </button>
        </form>
      </div>

      <EquipmentForm
        action={updateEquipment.bind(null, item.id)}
        initialValues={{
          type: item.type as EquipmentType,
          manufacturer: item.manufacturer,
          modelNumber: item.modelNumber,
          displayName: item.displayName,
          description: item.description,
          specs: item.specs as Record<string, unknown>,
        }}
      />

      <DocumentLinksPanel equipmentId={item.id} documents={item.documents} />
    </div>
  );
}
