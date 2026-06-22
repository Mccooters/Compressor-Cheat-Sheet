import Link from "next/link";
import { getEquipmentById } from "@/lib/equipment/queries";
import type { EquipmentType } from "@/lib/equipment/specSchemas";
import { getFaultTreesForEquipment, listFaultTrees } from "@/lib/faultTrees/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function WizardIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentId?: string }>;
}) {
  const { equipmentId } = await searchParams;
  const equipment = equipmentId ? await getEquipmentById(equipmentId) : null;
  const trees = equipment
    ? await getFaultTreesForEquipment(equipment.id, equipment.type as EquipmentType)
    : await listFaultTrees({ status: "published" });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Fault finder" />
      {equipment && (
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Showing fault trees for{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {equipment.displayName}
          </span>
          .{" "}
          <Link href="/wizard" className="text-amber-600 underline dark:text-amber-400">
            Clear filter
          </Link>
        </p>
      )}

      {trees.length === 0 ? (
        <EmptyState>No published fault trees yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {trees.map((tree) => (
            <li key={tree.id}>
              <Link
                href={
                  equipment
                    ? `/wizard/${tree.id}?equipmentId=${equipment.id}`
                    : `/wizard/${tree.id}`
                }
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60"
              >
                <span className="font-medium text-slate-900 dark:text-white">
                  {tree.title}
                </span>
                {tree.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tree.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
