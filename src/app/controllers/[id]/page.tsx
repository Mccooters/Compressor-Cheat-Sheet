import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getControllerById } from "@/lib/controllers/queries";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { Stat } from "@/components/ui/Stat";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/Button";

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
              className="max-h-32 w-32 shrink-0 rounded-md border border-slate-200 object-contain dark:border-slate-700"
            />
          )}
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {item.manufacturer}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {item.displayName}
            </h1>
          </div>
        </div>
        {session?.user && (
          <Link
            href={`/admin/controllers/${item.id}/edit`}
            className={buttonClass("secondary")}
          >
            Edit
          </Link>
        )}
      </div>

      {item.notes && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Password reset instructions
          </h2>
          <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">
            {item.notes}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Access codes
        </h2>
        {item.passwords.length === 0 ? (
          <EmptyState>
            No codes recorded yet.{" "}
            {session?.user && (
              <Link
                href={`/admin/controllers/${item.id}/edit`}
                className="text-amber-600 underline dark:text-amber-400"
              >
                Add one
              </Link>
            )}
          </EmptyState>
        ) : (
          <dl className="space-y-3">
            {item.passwords.map((p) => (
              <Stat key={p.id} label={p.label} value={<span className="font-mono">{p.value}</span>} />
            ))}
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Manuals
        </h2>
        {manuals.length === 0 ? (
          <EmptyState>
            No manuals linked yet.{" "}
            {session?.user && (
              <Link
                href={`/admin/controllers/${item.id}/edit`}
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
