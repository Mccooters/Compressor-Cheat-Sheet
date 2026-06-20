import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";
import { DeleteControllerButton } from "@/components/controllers/DeleteControllerButton";

export default async function AdminControllersListPage() {
  const items = await listControllers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage controllers</h1>
        <Link
          href="/admin/controllers/new"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Add controller
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="py-2">Manufacturer</th>
            <th className="py-2">Model</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2">{item.manufacturer}</td>
              <td className="py-2">{item.modelName}</td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/controllers/${item.id}/edit`}
                    className="underline"
                  >
                    Edit
                  </Link>
                  <DeleteControllerButton
                    controllerId={item.id}
                    displayName={item.displayName}
                    className="text-red-600 hover:underline"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
