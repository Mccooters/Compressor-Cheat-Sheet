import { EquipmentForm } from "@/components/equipment/EquipmentForm";
import { createEquipment } from "@/lib/equipment/actions";

export default function NewEquipmentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Add equipment</h1>
      <EquipmentForm action={createEquipment} submitLabel="Create" />
    </div>
  );
}
