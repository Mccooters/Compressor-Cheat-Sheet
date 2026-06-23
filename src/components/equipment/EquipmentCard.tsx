import Link from "next/link";
import { formatEquipmentTypeLabel } from "@/lib/equipment/specSchemas";
import { linkCardClass } from "@/components/ui/Card";

const typeColors: Record<string, string> = {
  compressor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  controller:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  dryer:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  line_filter: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  breathing_air: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  oily_water_separator:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  vacuum_pump:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  generator: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  nitrogen_generator:
    "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
};

const DEFAULT_TYPE_COLOR =
  "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";

export function EquipmentCard({
  equipment,
  photoSrc,
}: {
  equipment: {
    id: string;
    type: string;
    displayName: string;
    manufacturer: string;
    modelNumber: string;
  };
  photoSrc?: string | null;
}) {
  return (
    <Link
      href={`/equipment/${equipment.id}`}
      className={linkCardClass("flex items-start gap-3 p-4")}
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
        <img
          src={photoSrc}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-contain dark:border-slate-700"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700" />
      )}
      <div>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${typeColors[equipment.type] ?? DEFAULT_TYPE_COLOR}`}
        >
          {formatEquipmentTypeLabel(equipment.type)}
        </span>
        <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">
          {equipment.displayName}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {equipment.manufacturer} · {equipment.modelNumber}
        </p>
      </div>
    </Link>
  );
}
