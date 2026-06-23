import { isGraphConfigured } from "@/lib/graph/config";
import { addPviManualLink, deletePviResource, type PviResourceCategory } from "@/lib/pvi/actions";
import { PviResourceSharePointPicker } from "@/components/pvi/PviResourceSharePointPicker";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type PviResourceRow = { id: string; title: string; webUrl: string };

export function PviResourceSection({
  title,
  category,
  resources,
  canEdit,
}: {
  title: string;
  category: PviResourceCategory;
  resources: PviResourceRow[];
  canEdit: boolean;
}) {
  return (
    <Card as="section" className="space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>

      {resources.length === 0 ? (
        <EmptyState>Nothing added yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {resources.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
            >
              <a
                href={doc.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 underline dark:text-amber-400"
              >
                {doc.title}
              </a>
              {canEdit && (
                <form action={deletePviResource.bind(null, doc.id)}>
                  <Button type="submit" variant="danger">
                    Remove
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          {isGraphConfigured() && <PviResourceSharePointPicker category={category} />}

          <form action={addPviManualLink} className="space-y-3">
            <input type="hidden" name="category" value={category} />
            <input
              name="title"
              placeholder="Title"
              required
              className={fieldInputClass}
            />
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
        </>
      )}
    </Card>
  );
}
