import Link from "next/link";
import {
  listControllers,
  type ControllerSortField,
} from "@/lib/controllers/queries";
import { resolvePhotoSrc } from "@/lib/documents/photo";
import { DeleteControllerButton } from "@/components/controllers/DeleteControllerButton";
import { SortableTh } from "@/components/admin/SortableTh";
import { syncControllersFromSharePointAction } from "@/lib/controllers/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClass, Button } from "@/components/ui/Button";

const SORT_FIELDS: ControllerSortField[] = ["manufacturer", "modelName"];

export default async function AdminControllersListPage({
  searchParams,
}: {
  searchParams: Promise<{
    synced?: string;
    created?: string;
    updated?: string;
    skipped?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const sp = await searchParams;
  const sortField = SORT_FIELDS.includes(sp.sort as ControllerSortField)
    ? (sp.sort as ControllerSortField)
    : undefined;
  const items = await listControllers({
    sort: sortField,
    dir: sp.dir === "desc" ? "desc" : "asc",
  });
  const photoSrcs = new Map(
    await Promise.all(
      items.map(async (item) => {
        const photo = item.documents[0];
        return [item.id, photo ? await resolvePhotoSrc(photo) : null] as const;
      })
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Manage controllers" />
        <div className="flex items-center gap-3">
          <form action={syncControllersFromSharePointAction}>
            <Button type="submit" variant="secondary">
              Sync from SharePoint
            </Button>
          </form>
          <Link href="/admin/controllers/new" className={buttonClass()}>
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
          <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-zinc-800 dark:text-slate-400">
            <th className="py-2" />
            <SortableTh
              basePath="/admin/controllers"
              field="manufacturer"
              label="Manufacturer"
              currentSort={sp.sort}
              currentDir={sp.dir}
              defaultSort="manufacturer"
            />
            <SortableTh
              basePath="/admin/controllers"
              field="modelName"
              label="Model"
              currentSort={sp.sort}
              currentDir={sp.dir}
              defaultSort="manufacturer"
            />
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const photoSrc = photoSrcs.get(item.id);
            return (
            <tr key={item.id} className="border-b border-slate-100 dark:border-zinc-900">
              <td className="py-2">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed SharePoint URL
                  <img
                    src={photoSrc}
                    alt=""
                    className="h-8 w-8 rounded-md border border-slate-200 object-contain dark:border-zinc-700"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md border border-dashed border-slate-200 dark:border-zinc-700" />
                )}
              </td>
              <td className="py-2 text-slate-900 dark:text-white">{item.manufacturer}</td>
              <td className="py-2 text-slate-700 dark:text-slate-300">{item.modelName}</td>
              <td className="py-2 text-right">
                <div className="flex items-center justify-end gap-3">
                  <Link
                    href={`/admin/controllers/${item.id}/edit`}
                    className="text-orange-600 underline dark:text-orange-400"
                  >
                    Edit
                  </Link>
                  <DeleteControllerButton
                    controllerId={item.id}
                    displayName={item.displayName}
                    className="text-red-600 hover:underline dark:text-red-400"
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
