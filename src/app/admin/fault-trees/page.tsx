import Link from "next/link";
import { listFaultTrees } from "@/lib/faultTrees/queries";

export default async function AdminFaultTreesPage() {
  const trees = await listFaultTrees();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fault trees</h1>
        <Link
          href="/admin/fault-trees/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          New fault tree
        </Link>
      </div>

      {trees.length === 0 ? (
        <p className="text-neutral-500">No fault trees yet.</p>
      ) : (
        <ul className="space-y-2">
          {trees.map((tree) => (
            <li key={tree.id}>
              <Link
                href={`/admin/fault-trees/${tree.id}/edit`}
                className="flex items-center justify-between rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
              >
                <span>
                  <span className="font-medium">{tree.title}</span>
                  <span className="ml-2 text-xs uppercase text-neutral-500">
                    {tree.equipmentScope}
                  </span>
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    tree.status === "published"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {tree.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
