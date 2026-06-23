import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
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

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getEquipmentById(id);
  if (!item) notFound();

  const session = await auth();

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
              className="max-h-32 w-32 shrink-0 rounded-md border border-slate-200 object-contain dark:border-slate-700"
            />
          )}
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
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
        {session?.user && (
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

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Controllers
        </h2>
        {linkedControllers.length === 0 ? (
          <EmptyState>
            No controllers linked yet.{" "}
            {session?.user && (
              <Link
                href={`/admin/equipment/${item.id}/edit`}
                className="text-amber-600 underline dark:text-amber-400"
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
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60"
                >
                  {controllerPhotoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL, not a static asset next/image can optimize
                    <img
                      src={controllerPhotoSrc}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-contain dark:border-slate-700"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700" />
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
            {session?.user && (
              <Link
                href={`/admin/equipment/${item.id}/edit`}
                className="text-amber-600 underline dark:text-amber-400"
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
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-amber-500/60"
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
