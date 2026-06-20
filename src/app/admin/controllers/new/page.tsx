import { ControllerForm } from "@/components/controllers/ControllerForm";
import { createController } from "@/lib/controllers/actions";

export default function NewControllerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Add controller</h1>
      <ControllerForm action={createController} submitLabel="Create" />
    </div>
  );
}
