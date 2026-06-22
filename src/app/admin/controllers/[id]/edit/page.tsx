import { notFound } from "next/navigation";
import { ControllerForm } from "@/components/controllers/ControllerForm";
import { ControllerPasswordsPanel } from "@/components/controllers/ControllerPasswordsPanel";
import { ControllerFaultCodesPanel } from "@/components/controllers/ControllerFaultCodesPanel";
import { ControllerDocumentLinksPanel } from "@/components/controllers/ControllerDocumentLinksPanel";
import { DeleteControllerButton } from "@/components/controllers/DeleteControllerButton";
import { updateController } from "@/lib/controllers/actions";
import { getControllerById } from "@/lib/controllers/queries";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function EditControllerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getControllerById(id);
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader title={`Edit ${item.displayName}`} />
        <DeleteControllerButton
          controllerId={item.id}
          displayName={item.displayName}
          className="rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 dark:border-red-800"
        />
      </div>

      <ControllerForm
        action={updateController.bind(null, item.id)}
        initialValues={{
          manufacturer: item.manufacturer,
          modelName: item.modelName,
          displayName: item.displayName,
          notes: item.notes,
        }}
      />

      <ControllerPasswordsPanel controllerId={item.id} passwords={item.passwords} />

      <ControllerFaultCodesPanel controllerId={item.id} faultCodes={item.faultCodes} />

      <ControllerDocumentLinksPanel controllerId={item.id} documents={item.documents} />
    </div>
  );
}
