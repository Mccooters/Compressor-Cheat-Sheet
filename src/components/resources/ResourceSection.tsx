import { isGraphConfigured } from "@/lib/graph/config";
import { addResourceManualLink, deleteResource } from "@/lib/resources/actions";
import type { ResourceArea } from "@/lib/resources/queries";
import { ResourceSharePointPicker } from "@/components/resources/ResourceSharePointPicker";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type ResourceRow = {
  id: string;
  title: string;
  webUrl: string;
  source: string;
};

// Document titles follow a "<PREFIX> - <number> - <description>" convention
// (e.g. "AACITC - 002 - VSD Rotary Screw Compressor.docx") where the prefix
// distinguishes several unrelated document sets that otherwise all land in
// the same category — color-tag by prefix so they're easy to tell apart at
// a glance instead of one undifferentiated list.
const TITLE_TAGS = [
  { prefix: "AACITC", dot: "bg-emerald-500" },
  { prefix: "AACITP", dot: "bg-blue-500" },
  { prefix: "AACPR", dot: "bg-orange-500" },
];

function getTitleTag(title: string) {
  const upper = title.toUpperCase();
  return TITLE_TAGS.find((tag) => upper.startsWith(tag.prefix)) ?? null;
}

export function ResourceSection({
  area,
  title,
  category,
  resources,
  canEdit,
}: {
  area: ResourceArea;
  title: string;
  category: string;
  resources: ResourceRow[];
  canEdit: boolean;
}) {
  const usedTags = TITLE_TAGS.filter((tag) =>
    resources.some((r) => r.title.toUpperCase().startsWith(tag.prefix))
  );

  return (
    <Card as="section" className="space-y-4">
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>

      {usedTags.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          {usedTags.map((tag) => (
            <span key={tag.prefix} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${tag.dot}`} aria-hidden="true" />
              {tag.prefix}
            </span>
          ))}
        </div>
      )}

      {resources.length === 0 ? (
        <EmptyState>Nothing added yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {resources.map((doc) => {
            const tag = getTitleTag(doc.title);
            return (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
            >
              <a
                href={
                  doc.source === "graph"
                    ? `/api/resources/${doc.id}/pdf`
                    : doc.webUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-amber-600 underline dark:text-amber-400"
              >
                {tag && (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${tag.dot}`}
                    aria-hidden="true"
                  />
                )}
                {doc.title}
              </a>
              {canEdit && (
                <form action={deleteResource.bind(null, doc.id, area)}>
                  <Button type="submit" variant="danger">
                    Remove
                  </Button>
                </form>
              )}
            </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <>
          {isGraphConfigured() && (
            <ResourceSharePointPicker area={area} category={category} />
          )}

          <form action={addResourceManualLink} className="space-y-3">
            <input type="hidden" name="area" value={area} />
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
