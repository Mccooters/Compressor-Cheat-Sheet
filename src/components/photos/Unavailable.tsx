import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export function PhotosUnavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <PageHeader title="Photos" />
      <Card className="space-y-2">
        <p className="font-medium text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{detail}</p>
      </Card>
    </>
  );
}
