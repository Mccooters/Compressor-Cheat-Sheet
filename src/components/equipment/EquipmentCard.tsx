import Link from "next/link";

const typeColors: Record<string, string> = {
  compressor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  controller:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  dryer:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

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
      className="flex items-start gap-3 rounded-lg border border-neutral-200 p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
        <img
          src={photoSrc}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md border border-neutral-200 object-contain dark:border-neutral-800"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-neutral-200 dark:border-neutral-800" />
      )}
      <div>
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${typeColors[equipment.type] ?? ""}`}
        >
          {equipment.type}
        </span>
        <h3 className="mt-2 font-medium">{equipment.displayName}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {equipment.manufacturer} · {equipment.modelNumber}
        </p>
      </div>
    </Link>
  );
}
