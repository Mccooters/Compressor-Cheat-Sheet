import Link from "next/link";
import { getEquipmentById } from "@/lib/equipment/queries";
import type { EquipmentType } from "@/lib/equipment/specSchemas";
import { getFaultTreesForEquipment, listFaultTrees } from "@/lib/faultTrees/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { linkCardClass } from "@/components/ui/Card";

type Category =
  | "electrical"
  | "mechanical"
  | "lubrication"
  | "controls"
  | "safety"
  | "moisture";

const CATEGORY_INFO: { value: Category; label: string; description: string }[] = [
  {
    value: "electrical",
    label: "Electrical",
    description: "Won't start, motor/contactor faults, wrong rotation, drive trips, controller issues.",
  },
  {
    value: "mechanical",
    label: "Mechanical",
    description: "Noise, vibration, low output, and valve faults.",
  },
  {
    value: "lubrication",
    label: "Lubrication & Cooling",
    description: "Oil pressure, oil carryover, leaks, contamination, and overheating.",
  },
  {
    value: "controls",
    label: "Controls & Cycling",
    description: "Won't load, won't unload, or cycles too frequently.",
  },
  {
    value: "safety",
    label: "Safety & Pressure Relief",
    description: "Relief valve and overpressure issues.",
  },
  {
    value: "moisture",
    label: "Moisture & Drainage",
    description: "Condensate drain faults.",
  },
];

function FaultTreeList({
  trees,
  equipmentId,
}: {
  trees: { id: string; title: string; description: string | null }[];
  equipmentId?: string;
}) {
  if (trees.length === 0) {
    return <EmptyState>No published fault trees here yet.</EmptyState>;
  }
  return (
    <ul className="space-y-2">
      {trees.map((tree) => (
        <li key={tree.id}>
          <Link
            href={
              equipmentId
                ? `/wizard/${tree.id}?equipmentId=${equipmentId}`
                : `/wizard/${tree.id}`
            }
            className={linkCardClass("block p-4")}
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
  );
}

export default async function WizardIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentId?: string; category?: string }>;
}) {
  const { equipmentId, category } = await searchParams;
  const equipment = equipmentId ? await getEquipmentById(equipmentId) : null;

  // Equipment-scoped browsing keeps the existing flat list — it's already
  // narrowed down to what's relevant for that specific item.
  if (equipment) {
    const trees = await getFaultTreesForEquipment(equipment.id, equipment.type as EquipmentType);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Fault finder" />
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Showing fault trees for{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {equipment.displayName}
          </span>
          .{" "}
          <Link href="/wizard" className="text-orange-600 underline dark:text-orange-400">
            Clear filter
          </Link>
        </p>
        <FaultTreeList trees={trees} equipmentId={equipment.id} />
      </div>
    );
  }

  const allTrees = await listFaultTrees({ status: "published" });

  if (category) {
    const info = CATEGORY_INFO.find((c) => c.value === category);
    const trees = allTrees.filter((t) => t.category === category);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title={info?.label ?? "Fault finder"} description={info?.description} />
        <Link href="/wizard" className="text-sm text-orange-600 underline dark:text-orange-400">
          ← Back to categories
        </Link>
        <FaultTreeList trees={trees} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Fault finder"
        description="Start with what kind of problem this is, then pick the closest match."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORY_INFO.map((info) => {
          const count = allTrees.filter((t) => t.category === info.value).length;
          return (
            <Link
              key={info.value}
              href={`/wizard?category=${info.value}`}
              className={linkCardClass("p-4")}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {info.label}
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {count}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {info.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
