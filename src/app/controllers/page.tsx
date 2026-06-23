import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { LiveFilterForm } from "@/components/search/LiveFilterForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/components/ui/Field";
import { buttonClass } from "@/components/ui/Button";
import { linkCardClass } from "@/components/ui/Card";

export default async function ControllersListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = await listControllers({ q });

  const photoSrcs = new Map(
    await Promise.all(
      results.map(async (item) => {
        const photo = item.documents[0];
        return [item.id, photo ? await resolvePhotoSrc(photo) : null] as const;
      })
    )
  );

  const byManufacturer = new Map<string, typeof results>();
  for (const item of results) {
    const group = byManufacturer.get(item.manufacturer) ?? [];
    group.push(item);
    byManufacturer.set(item.manufacturer, group);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Controller passwords" />
        <Link href="/admin/controllers/new" className={buttonClass()}>
          Add controller
        </Link>
      </div>

      <LiveFilterForm>
        <input
          type="search"
          name="q"
          placeholder="Search manufacturer or model..."
          defaultValue={q}
          className={`min-w-64 flex-1 ${fieldInputClass}`}
        />
      </LiveFilterForm>

      {results.length === 0 ? (
        <EmptyState>No controllers found.</EmptyState>
      ) : (
        <div className="space-y-6">
          {Array.from(byManufacturer.entries()).map(([manufacturer, items]) => (
            <section key={manufacturer}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {manufacturer}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => {
                  const photoSrc = photoSrcs.get(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/controllers/${item.id}`}
                        className={linkCardClass("flex items-center gap-3 p-3")}
                      >
                        {photoSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
                          <img
                            src={photoSrc}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-md border border-slate-200 object-contain dark:border-slate-700"
                          />
                        ) : (
                          <div className="h-20 w-20 shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-white">
                          {item.modelName}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
