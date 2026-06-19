import Link from "next/link";
import { searchAll } from "@/lib/search/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchAll(q) : { equipment: [], faultTrees: [] };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">Search</h1>
      <form action="/search" className="flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search equipment and fault trees..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {q && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-medium">
              Equipment ({results.equipment.length})
            </h2>
            {results.equipment.length === 0 ? (
              <p className="text-sm text-neutral-500">No matches.</p>
            ) : (
              <ul className="space-y-2">
                {results.equipment.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/equipment/${item.id}`}
                      className="block rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                    >
                      <span className="font-medium">{item.displayName}</span>{" "}
                      <span className="text-sm text-neutral-500">
                        {item.manufacturer} · {item.modelNumber}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">
              Fault trees ({results.faultTrees.length})
            </h2>
            {results.faultTrees.length === 0 ? (
              <p className="text-sm text-neutral-500">No matches.</p>
            ) : (
              <ul className="space-y-2">
                {results.faultTrees.map((tree) => (
                  <li key={tree.id}>
                    <Link
                      href={`/wizard/${tree.id}`}
                      className="block rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                    >
                      <span className="font-medium">{tree.title}</span>
                      {tree.description && (
                        <span className="text-sm text-neutral-500">
                          {" "}
                          — {tree.description}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
