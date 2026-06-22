import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { createEquipment } from "@/lib/equipment/actions";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewEquipmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add equipment" />
      <EquipmentForm action={createEquipment} submitLabel="Create" />
    </div>
  );
}
