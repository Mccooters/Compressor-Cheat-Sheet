import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";

export default async function ControllersListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = await listControllers({ q });

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

      <form className="flex gap-3" action="/controllers">
        <input
          type="search"
          name="q"
          placeholder="Search manufacturer or model..."
          defaultValue={q}
          className="min-w-64 flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          Search
        </button>
      </form>

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
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/controllers/${item.id}`}
                      className="block rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                    >
                      {item.modelName}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
