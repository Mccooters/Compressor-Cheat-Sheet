import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import {
  formatEquipmentTypeLabel,
  specFieldsByType,
  type EquipmentType,
} from "@/lib/equipment/specSchemas";
import { getEquipmentById } from "@/lib/equipment/queries";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/Button";
import { linkCardClass } from "@/components/ui/Card";

type PressureOption = Record<string, unknown>;

function formatDimensions(d: unknown): string {
  if (typeof d === "string") return d;
  if (d && typeof d === "object") {
    const obj = d as Record<string, number>;
    const parts = [];
    if (obj.A_disassembly) parts.push(`A (disassembly): ${obj.A_disassembly}`);
    if (obj.B) parts.push(`B: ${obj.B}`);
    if (obj.C) parts.push(`C: ${obj.C}`);
    return parts.join(" · ") || "—";
  }
  return "—";
}

function CatalogPerformanceSection({
  specs,
  isAdmin,
}: {
  specs: Record<string, unknown>;
  isAdmin: boolean;
}) {
  const hasData =
    specs.outlet ||
    specs.weightKg ||
    specs.dimensionsMm ||
    specs.motorPowerKw ||
    specs.noiseLevelDba ||
    specs.refrigerant ||
    specs.capacityLmin ||
    specs.maxPressureBar ||
    specs.pressureOptions;

  if (!hasData) {
    if (!isAdmin) return null;
    return (
      <p className="text-sm text-slate-500 dark:text-slate-500">
        No performance data — edit to add motor power, noise level, outlet size,
        etc.
      </p>
    );
  }

  const pressureOptions = Array.isArray(specs.pressureOptions)
    ? (specs.pressureOptions as PressureOption[])
    : [];
  const hasMaxPressureCol = pressureOptions.some((p) => p.maxPressure_mpa !== undefined);

  const thClass =
    "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
  const tdClass = "px-3 py-2 text-sm text-slate-900 dark:text-white";

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
        Performance data
      </h2>

      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {specs.motorPowerKw !== undefined && (
          <Stat label="Motor power" value={`${String(specs.motorPowerKw)} kW`} />
        )}
        {specs.noiseLevelDba !== undefined && (
          <Stat label="Noise level" value={`${String(specs.noiseLevelDba)} dBA`} />
        )}
        {specs.outlet !== undefined && (
          <Stat label="Port size" value={String(specs.outlet)} />
        )}
        {specs.recommendedPipe !== undefined && (
          <Stat label="Recommended pipe" value={String(specs.recommendedPipe)} />
        )}
        {specs.weightKg !== undefined && (
          <Stat label="Weight" value={`${String(specs.weightKg)} kg`} />
        )}
        {specs.dimensionsMm !== undefined && (
          <Stat label="Dimensions (mm)" value={formatDimensions(specs.dimensionsMm)} />
        )}
        {specs.refrigerant !== undefined && (
          <Stat label="Refrigerant" value={String(specs.refrigerant)} />
        )}
        {specs.powerSupply !== undefined && (
          <Stat label="Power supply" value={String(specs.powerSupply)} />
        )}
        {specs.maxPressureBar !== undefined && (
          <Stat label="Max pressure" value={`${String(specs.maxPressureBar)} bar`} />
        )}
        {specs.capacityLmin !== undefined && (
          <Stat label="Max flow" value={`${String(specs.capacityLmin)} L/min`} />
        )}
        {specs.capacityM3h !== undefined && (
          <Stat label="Max flow" value={`${String(specs.capacityM3h)} m³/h`} />
        )}
      </dl>

      {pressureOptions.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-700">
            <thead className="bg-slate-50 dark:bg-zinc-900">
              <tr>
                <th className={thClass}>Pressure (MPa)</th>
                {hasMaxPressureCol && <th className={thClass}>Max (MPa)</th>}
                <th className={thClass}>Flow (L/s)</th>
                <th className={thClass}>Flow (CFM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
              {pressureOptions.map((opt, i) => (
                <tr key={i}>
                  <td className={tdClass}>{String(opt.workingPressure_mpa ?? "—")}</td>
                  {hasMaxPressureCol && (
                    <td className={tdClass}>{opt.maxPressure_mpa !== undefined ? String(opt.maxPressure_mpa) : "—"}</td>
                  )}
                  <td className={tdClass}>{String(opt.capacity_ls ?? "—")}</td>
                  <td className={tdClass}>{String(opt.capacity_cfm ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getEquipmentById(id);
  if (!item) notFound();

  const isAdmin = (await getCurrentUserRole()) === "admin";

  const fields = specFieldsByType[item.type as EquipmentType];
  const specs = (item.specs as Record<string, unknown>) ?? {};

  const photo = item.documents.find((d) => d.docType === "photo");
  const manuals = item.documents.filter((d) => d.docType !== "photo");
  const photoSrc = photo ? await resolvePhotoSrc(photo) : null;

  const linkedControllers = await Promise.all(
    item.controllerLinks.map(async (link) => {
      const controllerPhoto = link.controller.documents[0];
      return {
        controller: link.controller,
        photoSrc: controllerPhoto ? await resolvePhotoSrc(controllerPhoto) : null,
      };
    })
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {photoSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL, not a static asset next/image can optimize
            <img
              src={photoSrc}
              alt={item.displayName}
              className="max-h-32 w-32 shrink-0 rounded-md border border-slate-200 object-contain dark:border-zinc-700"
            />
          )}
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              {formatEquipmentTypeLabel(item.type)}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {item.displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {item.manufacturer} · {item.modelNumber}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href={`/admin/equipment/${item.id}/edit`}
            className={buttonClass("secondary")}
          >
            Edit
          </Link>
        )}
      </div>

      {item.description && (
        <p className="text-slate-700 dark:text-slate-300">{item.description}</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Specs
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields
            .filter((f) => specs[f.key] !== undefined && specs[f.key] !== "")
            .map((f) => (
              <Stat
                key={f.key}
                label={f.label}
                value={`${String(specs[f.key])}${f.unit ? ` ${f.unit}` : ""}`}
              />
            ))}
        </dl>
        {fields.every((f) => specs[f.key] === undefined || specs[f.key] === "") && (
          <EmptyState>No specs recorded yet.</EmptyState>
        )}
      </section>

      <CatalogPerformanceSection specs={specs} isAdmin={isAdmin} />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Controllers
        </h2>
        {linkedControllers.length === 0 ? (
          <EmptyState>
            No controllers linked yet.{" "}
            {isAdmin && (
              <Link
                href={`/admin/equipment/${item.id}/edit`}
                className="text-orange-600 underline dark:text-orange-400"
              >
                Add one
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {linkedControllers.map(({ controller, photoSrc: controllerPhotoSrc }) => (
              <li key={controller.id}>
                <Link
                  href={`/controllers/${controller.id}`}
                  className={linkCardClass("flex items-center gap-3 p-3")}
                >
                  {controllerPhotoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL, not a static asset next/image can optimize
                    <img
                      src={controllerPhotoSrc}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-contain dark:border-zinc-700"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-slate-200 dark:border-zinc-700" />
                  )}
                  <span className="font-medium text-slate-900 dark:text-white">
                    {controller.displayName}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Manuals &amp; datasheets
        </h2>
        {manuals.length === 0 ? (
          <EmptyState>
            No manuals linked yet.{" "}
            {isAdmin && (
              <Link
                href={`/admin/equipment/${item.id}/edit`}
                className="text-orange-600 underline dark:text-orange-400"
              >
                Add one
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {manuals.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCardClass("flex items-center justify-between p-3")}
                >
                  <span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {doc.title}
                    </span>
                    <span className="ml-2 text-xs uppercase text-slate-500 dark:text-slate-500">
                      {doc.docType}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {doc.source === "graph" ? "SharePoint" : "Link"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
