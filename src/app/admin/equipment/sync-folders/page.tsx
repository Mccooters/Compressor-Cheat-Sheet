// Allow up to 60 s for the batch folder-creation server action.
export const maxDuration = 60;

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";
import { isGraphConfigured, getEquipmentFolderConfig } from "@/lib/graph/config";
import { syncMissingEquipmentFolders } from "@/lib/equipment/folderSync";

export default async function SyncFoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string; errors?: string; error?: string }>;
}) {
  const { synced, errors, error } = await searchParams;

  const [linkedRows, unlinkedRows] = await Promise.all([
    db
      .select({ id: equipment.id })
      .from(equipment)
      .where(and(eq(equipment.status, "active"), isNotNull(equipment.sharepointFolderUrl))),
    db
      .select({
        id: equipment.id,
        type: equipment.type,
        displayName: equipment.displayName,
        manufacturer: equipment.manufacturer,
        modelNumber: equipment.modelNumber,
      })
      .from(equipment)
      .where(and(eq(equipment.status, "active"), isNull(equipment.sharepointFolderUrl)))
      .orderBy(equipment.manufacturer, equipment.modelNumber),
  ]);

  const graphOk = isGraphConfigured();
  const folderConfig = getEquipmentFolderConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="SharePoint Folder Sync"
        description="Auto-create Equipment Manuals folders in SharePoint for each equipment record."
      />

      {/* Config status */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Configuration
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Graph / Entra ID:</dt>
            <dd className={graphOk ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {graphOk ? "Configured" : "Not configured — set AUTH_MICROSOFT_ENTRA_ID_* env vars"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Site:</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {folderConfig?.siteUrl ?? (
                <span className="text-red-600 dark:text-red-400">
                  Not set — add SHAREPOINT_EQUIPMENT_SITE_URL
                </span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400">Library:</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200">
              {folderConfig?.libraryName ?? (
                <span className="text-red-600 dark:text-red-400">
                  Not set — add SHAREPOINT_EQUIPMENT_LIBRARY
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Linked", value: linkedRows.length, colour: "text-green-600 dark:text-green-400" },
          { label: "Missing", value: unlinkedRows.length, colour: "text-orange-600 dark:text-orange-400" },
          { label: "Total active", value: linkedRows.length + unlinkedRows.length, colour: "text-slate-700 dark:text-slate-300" },
        ].map(({ label, value, colour }) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${colour}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Result banner */}
      {synced !== undefined && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Sync complete — {synced} folder{Number(synced) !== 1 ? "s" : ""} created
          {Number(errors) > 0 && `, ${errors} error${Number(errors) !== 1 ? "s" : ""}`}.
        </div>
      )}
      {error === "graph_not_configured" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          Microsoft Graph is not configured — set AUTH_MICROSOFT_ENTRA_ID_* and
          SHAREPOINT_EQUIPMENT_SITE_URL / SHAREPOINT_EQUIPMENT_LIBRARY.
        </div>
      )}

      {/* Sync action */}
      {unlinkedRows.length > 0 && (
        <div className="space-y-2">
          <form action={syncMissingEquipmentFolders}>
            <button
              type="submit"
              className={buttonClass("primary")}
              disabled={!graphOk || !folderConfig}
            >
              Sync {unlinkedRows.length} missing folder{unlinkedRows.length !== 1 ? "s" : ""}
            </button>
          </form>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            May take up to 30–60 seconds for large batches. The page will reload
            when complete.
          </p>
        </div>
      )}
      {unlinkedRows.length === 0 && synced === undefined && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          All active equipment already has a SharePoint folder linked.
        </p>
      )}

      {/* Unlinked list */}
      {unlinkedRows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  Equipment
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  Type
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">
                  Expected path
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {unlinkedRows.map((row) => {
                const typeLabel = row.type.replace(/_/g, " ");
                return (
                  <tr key={row.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">
                      {row.displayName}
                    </td>
                    <td className="px-4 py-2 capitalize text-slate-500 dark:text-slate-400">
                      {typeLabel}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {row.manufacturer}/{row.modelNumber}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
