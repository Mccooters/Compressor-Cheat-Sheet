import { ARCHIVE_FOLDER, listChildren } from "@/lib/photos/library";
import { openPhotoLibrary } from "@/lib/photos/open";
import { formatDay, formatDayTime, formatSize } from "@/lib/photos/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { FolderList } from "@/components/photos/FolderList";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { PhotosUnavailable } from "@/components/photos/Unavailable";

export const dynamic = "force-dynamic";

// The work folder's top level: one folder per job (or per client, when the
// company files by client), most recently changed first.
export default async function PhotosPage() {
  const library = await openPhotoLibrary();
  if (!library.ok) return <PhotosUnavailable title={library.title} detail={library.detail} />;

  let top: Awaited<ReturnType<typeof listChildren>>;
  try {
    top = await listChildren(library.client, library.root.driveId, library.root.folderId);
  } catch (err) {
    console.error("Couldn't list the photo folders:", err);
    return (
      <PhotosUnavailable
        title="Couldn't read the photo folders"
        detail="SharePoint didn't answer. Reload the page in a moment."
      />
    );
  }

  const folders = top.folders
    .filter((folder) => folder.name !== ARCHIVE_FOLDER)
    .sort((a, b) => (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? ""))
    .map((folder) => ({ id: folder.id, name: folder.name, modified: formatDay(folder.modifiedAt) }));

  return (
    <>
      <PageHeader
        title="Photos"
        description="The job photos taken with the Air Assist app, straight from SharePoint. Open a job to see its photos."
      />
      <FolderList folders={folders} />
      {top.files.length > 0 && (
        <PhotoGrid
          sections={[
            {
              key: "top",
              title: "Not in a job folder",
              files: top.files.map((file) => ({
                id: file.id,
                name: file.name,
                kind: file.kind,
                when: formatDayTime(file.takenAt),
                size: formatSize(file.size),
                thumbUrl: file.thumbUrl,
              })),
            },
          ]}
        />
      )}
    </>
  );
}
