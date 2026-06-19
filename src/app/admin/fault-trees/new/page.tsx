import { NewFaultTreeForm } from "@/components/faultTrees/NewFaultTreeForm";

export default function NewFaultTreePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New fault tree</h1>
      <NewFaultTreeForm />
    </div>
  );
}
