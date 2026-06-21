import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getControllerById } from "@/lib/controllers/queries";
import { resolvePhotoSrc } from "@/lib/documents/photo";

export default async function ControllerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getControllerById(id);
  if (!item) notFound();

  const session = await auth();

  const photo = item.documents.find((d) => d.docType === "photo");
  const manuals = item.documents.filter((d) => d.docType !== "photo");
  const photoSrc = photo ? await resolvePhotoSrc(photo) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {photoSrc && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL, not a static asset next/image can optimize
            <img
              src={photoSrc}
              alt={item.displayName}
              className="max-h-32 w-32 shrink-0 rounded-md border border-neutral-200 object-contain dark:border-neutral-800"
            />
          )}
          <div>
            <span className="text-xs font-medium uppercase text-neutral-500">
              {item.manufacturer}
            </span>
            <h1 className="text-2xl font-semibold">{item.displayName}</h1>
          </div>
        </div>
        {session?.user && (
          <Link
            href={`/admin/controllers/${item.id}/edit`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            Edit
          </Link>
        )}
      </div>

      {item.notes && (
        <section>
          <h2 className="mb-2 text-lg font-medium">Password reset instructions</h2>
          <p className="whitespace-pre-line text-neutral-700 dark:text-neutral-300">
            {item.notes}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Access codes</h2>
        {item.passwords.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No codes recorded yet.{" "}
            {session?.user && (
              <Link href={`/admin/controllers/${item.id}/edit`} className="underline">
                Add one
              </Link>
            )}
          </p>
        ) : (
          <dl className="space-y-3">
            {item.passwords.map((p) => (
              <div
                key={p.id}
                className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <dt className="text-xs font-medium uppercase text-neutral-500">
                  {p.label}
                </dt>
                <dd className="font-mono">{p.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Manuals</h2>
        {manuals.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No manuals linked yet.{" "}
            {session?.user && (
              <Link href={`/admin/controllers/${item.id}/edit`} className="underline">
                Add one
              </Link>
            )}
          </p>
        ) : (
          <ul className="space-y-2">
            {manuals.map((doc) => (
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
    </div>
  );
}
