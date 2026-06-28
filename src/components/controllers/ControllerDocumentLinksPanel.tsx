import { isGraphConfigured } from "@/lib/graph/config";
import {
  addControllerManualLink,
  deleteControllerDocumentLink,
} from "@/lib/controllers/documentActions";
import { ControllerSharePointPicker } from "@/components/controllers/ControllerSharePointPicker";
import { Card } from "@/components/ui/Card";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type DocumentLinkRow = {
  id: string;
  title: string;
  docType: string;
  webUrl: string;
  source: string;
};

export function ControllerDocumentLinksPanel({
  controllerId,
  documents,
}: {
  controllerId: string;
  documents: DocumentLinkRow[];
}) {
  return (
    <Card as="section" className="space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white">
        Photo &amp; manuals
      </h2>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-zinc-700"
            >
              <a
                href={doc.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 underline dark:text-orange-400"
              >
                {doc.title}{" "}
                <span className="text-slate-400 dark:text-slate-500">
                  ({doc.docType})
                </span>
              </a>
              <form
                action={deleteControllerDocumentLink.bind(null, doc.id, controllerId)}
              >
                <Button type="submit" variant="danger">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {isGraphConfigured() && (
        <ControllerSharePointPicker controllerId={controllerId} />
      )}

      <form action={addControllerManualLink} className="space-y-3">
        <input type="hidden" name="controllerId" value={controllerId} />
        <div className="flex gap-3">
          <input
            name="title"
            placeholder="Title (e.g. Front panel photo)"
            required
            className={`flex-1 ${fieldInputClass}`}
          />
          <select name="docType" className={`flex-1 ${fieldInputClass}`}>
            <option value="photo">Photo</option>
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
          className={fieldInputClass}
        />
        <Button type="submit" variant="secondary">
          Add link
        </Button>
        {!isGraphConfigured() && (
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Paste a SharePoint share link above. SharePoint search isn&apos;t
            configured yet — see docs/azure-ad-setup.md to enable it.
          </p>
        )}
      </form>
    </Card>
  );
}
