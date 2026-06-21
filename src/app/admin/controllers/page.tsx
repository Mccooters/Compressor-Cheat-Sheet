import Link from "next/link";
import { listControllers } from "@/lib/controllers/queries";
import { resolveControllerPhotoSrc } from "@/lib/controllers/photo";
import { DeleteControllerButton } from "@/components/controllers/DeleteControllerButton";
import { syncControllersFromSharePointAction } from "@/lib/controllers/actions";

export default async function AdminControllersListPage({
  searchParams,
}: {
  searchParams: Promise<{
    synced?: string;
    created?: string;
    updated?: string;
    skipped?: string;
  }>;
}) {
  const items = await listControllers();
  const sp = await searchParams;
  const photoSrcs = new Map(
    await Promise.all(
      items.map(async (item) => {
        const photo = item.documents[0];
        return [item.id, photo ? await resolveControllerPhotoSrc(photo) : null] as const;
      })
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage controllers</h1>
        <div className="flex items-center gap-3">
          <form action={syncControllersFromSharePointAction}>
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
            >
              Sync from SharePoint
            </button>
          </form>
          <Link
            href="/admin/controllers/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Add controller
          </Link>
        </div>
      </div>

      {sp.synced && (
        <p className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          Synced from SharePoint: {sp.created} created, {sp.updated} updated,{" "}
          {sp.skipped} skipped.
        </p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <th className="py-2" />
            <th className="py-2">Manufacturer</th>
            <th className="py-2">Model</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const photoSrc = photoSrcs.get(item.id);
            return (
            <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
                  <img
                    src={photoSrc}
                    alt=""
                    className="h-8 w-8 rounded-md border border-neutral-200 object-contain dark:border-neutral-800"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md border border-dashed border-neutral-200 dark:border-neutral-800" />
                )}
              </td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
