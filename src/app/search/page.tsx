import Link from "next/link";
import { searchAll } from "@/lib/search/queries";
import { LiveFilterForm } from "@/components/search/LiveFilterForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/components/ui/Field";
import { linkCardClass } from "@/components/ui/Card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchAll(q) : { equipment: [], controllers: [], faultTrees: [] };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Search" />
      <LiveFilterForm>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search equipment, controllers, and fault trees..."
          className={`flex-1 ${fieldInputClass}`}
        />
      </LiveFilterForm>

      {q && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
              Equipment ({results.equipment.length})
            </h2>
            {results.equipment.length === 0 ? (
              <EmptyState>No matches.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {results.equipment.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/equipment/${item.id}`}
                      className={linkCardClass("block p-3")}
                    >
                      <span className="font-medium text-slate-900 dark:text-white">
                        {item.displayName}
                      </span>{" "}
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {item.manufacturer} · {item.modelNumber}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
              Controllers ({results.controllers.length})
            </h2>
            {results.controllers.length === 0 ? (
              <EmptyState>No matches.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {results.controllers.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/controllers/${item.id}`}
                      className={linkCardClass("block p-3")}
                    >
                      <span className="font-medium text-slate-900 dark:text-white">
                        {item.displayName}
                      </span>{" "}
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {item.manufacturer} · {item.modelName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
              Fault trees ({results.faultTrees.length})
            </h2>
            {results.faultTrees.length === 0 ? (
              <EmptyState>No matches.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {results.faultTrees.map((tree) => (
                  <li key={tree.id}>
                    <Link
                      href={`/wizard/${tree.id}`}
                      className={linkCardClass("block p-3")}
                    >
                      <span className="font-medium text-slate-900 dark:text-white">
                        {tree.title}
                      </span>
                      {tree.description && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
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
