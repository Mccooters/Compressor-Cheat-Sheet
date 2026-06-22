import { NewFaultTreeForm } from "@/components/faultTrees/NewFaultTreeForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewFaultTreePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New fault tree" />
      <NewFaultTreeForm />
    </div>
  );
}
