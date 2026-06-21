import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { LiveFilterForm } from "@/components/search/LiveFilterForm";

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
        <h1 className="text-xl font-semibold">Controller passwords</h1>
        <Link
          href="/admin/controllers/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Add controller
        </Link>
      </div>

      <LiveFilterForm>
        <input
          type="search"
          name="q"
          placeholder="Search manufacturer or model..."
          defaultValue={q}
          className="min-w-64 flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </LiveFilterForm>

      {results.length === 0 ? (
        <p className="text-neutral-500">No controllers found.</p>
      ) : (
        <div className="space-y-6">
          {Array.from(byManufacturer.entries()).map(([manufacturer, items]) => (
            <section key={manufacturer}>
              <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">
                {manufacturer}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => {
                  const photoSrc = photoSrcs.get(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/controllers/${item.id}`}
                        className="flex items-center gap-3 rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                      >
                        {photoSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
                          <img
                            src={photoSrc}
                            alt=""
                            className="h-20 w-20 shrink-0 rounded-md border border-neutral-200 object-contain dark:border-neutral-800"
                          />
                        ) : (
                          <div className="h-20 w-20 shrink-0 rounded-md border border-dashed border-neutral-200 dark:border-neutral-800" />
                        )}
                        <span className="font-medium">{item.modelName}</span>
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
