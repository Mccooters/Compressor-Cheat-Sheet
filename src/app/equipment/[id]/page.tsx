import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { specFieldsByType, type EquipmentType } from "@/lib/equipment/specSchemas";
import { getEquipmentById } from "@/lib/equipment/queries";
import { getFaultTreesForEquipment } from "@/lib/faultTrees/queries";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getEquipmentById(id);
  if (!item) notFound();

  const [session, faultTrees] = await Promise.all([
    auth(),
    getFaultTreesForEquipment(item.id, item.type as EquipmentType),
  ]);

  const fields = specFieldsByType[item.type as EquipmentType];
  const specs = (item.specs as Record<string, unknown>) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase text-neutral-500">
            {item.type}
          </span>
          <h1 className="text-2xl font-semibold">{item.displayName}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {item.manufacturer} · {item.modelNumber}
          </p>
        </div>
        {session?.user && (
          <Link
            href={`/admin/equipment/${item.id}/edit`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            Edit
          </Link>
        )}
      </div>

      {item.description && (
        <p className="text-neutral-700 dark:text-neutral-300">{item.description}</p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Specs</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields
            .filter((f) => specs[f.key] !== undefined && specs[f.key] !== "")
            .map((f) => (
              <div key={f.key} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <dt className="text-xs text-neutral-500">{f.label}</dt>
                <dd className="font-medium">
                  {String(specs[f.key])}
                  {f.unit ? ` ${f.unit}` : ""}
                </dd>
              </div>
            ))}
          {fields.every((f) => specs[f.key] === undefined || specs[f.key] === "") && (
            <p className="text-sm text-neutral-500">No specs recorded yet.</p>
          )}
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Manuals &amp; datasheets</h2>
        {item.documents.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No manuals linked yet.{" "}
            {session?.user && (
              <Link href={`/admin/equipment/${item.id}/edit`} className="underline">
                Add one
              </Link>
            )}
          </p>
        ) : (
          <ul className="space-y-2">
            {item.documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                >
                  <span>
                    <span className="font-medium">{doc.title}</span>
                    <span className="ml-2 text-xs uppercase text-neutral-500">
                      {doc.docType}
                    </span>
                  </span>
                  <span className="text-xs text-neutral-400">
                    {doc.source === "graph" ? "SharePoint" : "Link"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Fault finding</h2>
        {faultTrees.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No fault trees published for this equipment yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {faultTrees.map((tree) => (
              <li key={tree.id}>
                <Link
                  href={`/wizard/${tree.id}?equipmentId=${item.id}`}
                  className="block rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
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
      </section>
    </div>
  );
}
