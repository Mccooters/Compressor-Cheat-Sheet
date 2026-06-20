import { isGraphConfigured } from "@/lib/graph/config";
import { inspectSharedListUrl } from "@/lib/graph/lists";

export default async function SharePointInspectPage() {
  const listUrl = process.env.SHAREPOINT_CONTROLLER_LIST_URL;

  if (!isGraphConfigured()) {
    return (
      <p className="text-sm text-neutral-500">
        Microsoft Entra ID / Graph isn&apos;t configured — see docs/azure-ad-setup.md.
      </p>
    );
  }

  if (!listUrl) {
    return (
      <p className="text-sm text-neutral-500">
        SHAREPOINT_CONTROLLER_LIST_URL isn&apos;t set.
      </p>
    );
  }

  let result: unknown;
  let error: string | undefined;
  try {
    result = await inspectSharedListUrl(listUrl);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">SharePoint list inspector</h1>
      <p className="text-sm text-neutral-500">
        One-off diagnostic page — not linked from anywhere. Shows the raw Graph
        API responses for {listUrl} so the real shape can inform the sync
        implementation. Requires being signed in with a real Microsoft
        account (dev login has no Graph access token).
      </p>
      {error ? (
        <pre className="overflow-auto rounded-md bg-red-50 p-4 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </pre>
      ) : (
        <pre className="overflow-auto rounded-md bg-neutral-100 p-4 text-xs dark:bg-neutral-900">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
