import Link from "next/link";
import { notFound } from "next/navigation";
import { getFolderInfo, listChildren, readFolder } from "@/lib/photos/library";
import { openPhotoLibrary } from "@/lib/photos/open";
import { formatDayTime, formatSize } from "@/lib/photos/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { linkCardClass } from "@/components/ui/Card";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { PhotosUnavailable } from "@/components/photos/Unavailable";

export const dynamic = "force-dynamic";

// One folder (a job, a client, a day) with its photos and those in the
// folders below it, so a job shows every day's photos on one page.
export default async function PhotoFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  // SharePoint item IDs are letters and digits; anything else isn't one.
  if (!/^[A-Za-z0-9!_-]{1,200}$/.test(folderId)) notFound();

  const library = await openPhotoLibrary();
  if (!library.ok) return <PhotosUnavailable title={library.title} detail={library.detail} />;
  const { client, root } = library;
  if (folderId === root.folderId) notFound();

  let info: Awaited<ReturnType<typeof getFolderInfo>>;
  let view: Awaited<ReturnType<typeof readFolder>>;
  try {
    info = await getFolderInfo(client, root, folderId);
    if (!info) notFound();
    view = await readFolder(folderId, (id) => listChildren(client, root.driveId, id));
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 404) notFound();
    // notFound() works by throwing; let that through.
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_")) throw err;
    console.error("Couldn't read a photo folder:", err);
    return (
      <PhotosUnavailable
        title="Couldn't read this folder"
        detail="SharePoint didn't answer. Reload the page in a moment."
      />
    );
  }

  const parentHref =
    !info.parentId || info.parentId === root.folderId ? "/photos" : `/photos/${info.parentId}`;
  const total = view.sections.reduce((count, section) => count + section.files.length, 0);

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 dark:text-slate-400">
        <Link href="/photos" className="font-medium text-orange-600 hover:underline dark:text-orange-400">
          Photos
        </Link>
        {info.path.slice(0, -1).map((name, index) => (
          <span key={`${index}-${name}`}>
            {" › "}
            {index === info.path.length - 2 ? (
              <Link href={parentHref} className="font-medium text-orange-600 hover:underline dark:text-orange-400">
                {name}
              </Link>
            ) : (
              name
            )}
          </span>
        ))}
      </nav>
      <PageHeader
        title={info.name}
        description={total === 1 ? "1 photo or document" : `${total} photos and documents`}
      />

      {total === 0 && view.unread.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing has been filed here yet.</p>
      )}

      <PhotoGrid
        sections={view.sections
          .filter((section) => section.files.length > 0)
          .map((section) => ({
            key: section.folderId,
            title: section.path.join(" › "),
            files: section.files.map((file) => ({
              id: file.id,
              name: file.name,
              kind: file.kind,
              when: formatDayTime(file.takenAt),
              size: formatSize(file.size),
              thumbUrl: file.thumbUrl,
            })),
          }))}
      />

      {view.unread.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            More folders
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {view.unread.map((folder) => (
              <li key={folder.id}>
                <Link href={`/photos/${folder.id}`} className={linkCardClass("block p-4")}>
                  <span className="block font-medium text-slate-900 dark:text-white">
                    {folder.path.join(" › ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
