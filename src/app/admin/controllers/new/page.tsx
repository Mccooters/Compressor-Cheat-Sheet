import { ControllerForm } from "@/components/controllers/ControllerForm";
import { createController } from "@/lib/controllers/actions";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewControllerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add controller" />
      <ControllerForm action={createController} submitLabel="Create" />
    </div>
  );
}
