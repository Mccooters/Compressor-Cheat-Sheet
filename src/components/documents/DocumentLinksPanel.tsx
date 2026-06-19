import { isGraphConfigured } from "@/lib/graph/config";
import { addManualLink, deleteDocumentLink } from "@/lib/documents/actions";
import { SharePointPicker } from "@/components/documents/SharePointPicker";

type DocumentLinkRow = {
  id: string;
  title: string;
  docType: string;
  webUrl: string;
  source: string;
};

export function DocumentLinksPanel({
  equipmentId,
  documents,
}: {
  equipmentId: string;
  documents: DocumentLinkRow[];
}) {
  return (
    <section className="space-y-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="font-medium">Manuals &amp; datasheets</h2>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-800"
            >
              <a
                href={doc.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {doc.title} <span className="text-neutral-400">({doc.docType})</span>
              </a>
              <form action={deleteDocumentLink.bind(null, doc.id, equipmentId)}>
                <button type="submit" className="text-red-600 hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {isGraphConfigured() && <SharePointPicker equipmentId={equipmentId} />}

      <form action={addManualLink} className="space-y-3">
        <input type="hidden" name="equipmentId" value={equipmentId} />
        <div className="flex gap-3">
          <input
            name="title"
            placeholder="Title (e.g. Installation manual)"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            name="docType"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="manual">Manual</option>
            <option value="datasheet">Datasheet</option>
            <option value="wiring_diagram">Wiring diagram</option>
            <option value="parts_list">Parts list</option>
            <option value="other">Other</option>
          </select>
        </div>
        <input
          name="webUrl"
          type="url"
          required
          placeholder="https://yourcompany.sharepoint.com/..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Add link
        </button>
        {!isGraphConfigured() && (
          <p className="text-xs text-neutral-500">
            Paste a SharePoint share link above. SharePoint search isn&apos;t
            configured yet — see docs/azure-ad-setup.md to enable it.
          </p>
        )}
      </form>
    </section>
  );
}
