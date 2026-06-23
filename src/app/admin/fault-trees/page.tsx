import Link from "next/link";
import { listFaultTrees } from "@/lib/faultTrees/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { linkCardClass } from "@/components/ui/Card";

export default async function AdminFaultTreesPage() {
  const trees = await listFaultTrees();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Fault trees" />
        <Link href="/admin/fault-trees/new" className={buttonClass()}>
          New fault tree
        </Link>
      </div>

      {trees.length === 0 ? (
        <EmptyState>No fault trees yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {trees.map((tree) => (
            <li key={tree.id}>
              <Link
                href={`/admin/fault-trees/${tree.id}/edit`}
                className={linkCardClass("flex items-center justify-between p-3")}
              >
                <span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {tree.title}
                  </span>
                  <span className="ml-2 text-xs uppercase text-slate-500 dark:text-slate-500">
                    {tree.equipmentScope}
                  </span>
                </span>
                <Badge tone={tree.status === "published" ? "green" : "neutral"}>
                  {tree.status}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
