import Link from "next/link";
import { getEquipmentById } from "@/lib/equipment/queries";
import type { EquipmentType } from "@/lib/equipment/specSchemas";
import { getFaultTreesForEquipment, listFaultTrees } from "@/lib/faultTrees/queries";

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
      <h1 className="text-xl font-semibold">Fault finder</h1>
      {equipment && (
        <p className="text-sm text-neutral-500">
          Showing fault trees for{" "}
          <span className="font-medium">{equipment.displayName}</span>.{" "}
          <Link href="/wizard" className="underline">
            Clear filter
          </Link>
        </p>
      )}

      {trees.length === 0 ? (
        <p className="text-neutral-500">No published fault trees yet.</p>
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
                className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <span className="font-medium">{tree.title}</span>
                {tree.description && (
                  <p className="text-sm text-neutral-500">{tree.description}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
