import type { Client } from "@microsoft/microsoft-graph-client";
import { findDriveByName, resolveSiteId } from "@/lib/graph/equipmentFolders";

// The job photos the Air Assist app files in SharePoint, read for the
// website's Photos pages.
//
// The app's work folder is laid out as <job>/<date>/files (or
// <client>/<job>/<date>/files when the company files by client), with an
// "Archive" folder for finished jobs. Nothing here assumes one layout: a
// folder is shown with whatever is in it and, one request per folder, what
// is in the folders below it.

export type PhotoKind = "image" | "video" | "document";

export type PhotoFile = {
  id: string;
  name: string;
  kind: PhotoKind;
  /** When it was taken, else when it was uploaded (ISO). */
  takenAt: string | null;
  size: number | null;
  /** Short-lived, pre-authenticated thumbnail addresses from SharePoint. */
  thumbUrl: string | null;
  largeUrl: string | null;
};

export type PhotoFolder = {
  id: string;
  name: string;
  modifiedAt: string | null;
  childCount: number | null;
};

/** The files in one folder below the one being shown. */
export type PhotoSection = {
  /** Names from the shown folder down to this one, e.g. ["2026-11-13"]. Empty for the folder itself. */
  path: string[];
  folderId: string;
  files: PhotoFile[];
};

export type FolderView = {
  sections: PhotoSection[];
  /** Folders too deep or too many to read on this page; opened on their own instead. */
  unread: (PhotoFolder & { path: string[] })[];
};

type GraphThumb = { url?: string };
type GraphItem = {
  id?: string;
  name?: string;
  size?: number;
  folder?: { childCount?: number };
  file?: { mimeType?: string };
  photo?: { takenDateTime?: string };
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  thumbnails?: { medium?: GraphThumb; large?: GraphThumb }[];
};
type GraphPage = { value?: GraphItem[]; "@odata.nextLink"?: string };

const IMAGE = new Set(["jpg", "jpeg", "png", "heic", "heif", "gif", "webp", "tif", "tiff", "bmp"]);
const VIDEO = new Set(["mov", "mp4", "m4v", "avi"]);

/** The top-level folder for finished jobs; the gallery leaves it out, as the app does. */
export const ARCHIVE_FOLDER = "Archive";

/** What a file is, from its type or its name. Null for anything the gallery doesn't show. */
export function kindOf(name: string, mimeType?: string | null): PhotoKind | null {
  const mime = mimeType?.toLowerCase() ?? "";
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (mime.startsWith("image/") || IMAGE.has(extension)) return "image";
  if (mime.startsWith("video/") || VIDEO.has(extension)) return "video";
  if (mime === "application/pdf" || extension === "pdf") return "document";
  return null;
}

/** Newest first; files with no date go last, then by name so the order is stable. */
export function newestFirst(a: PhotoFile, b: PhotoFile): number {
  if (a.takenAt && b.takenAt && a.takenAt !== b.takenAt) return a.takenAt < b.takenAt ? 1 : -1;
  if (a.takenAt && !b.takenAt) return -1;
  if (!a.takenAt && b.takenAt) return 1;
  return a.name.localeCompare(b.name);
}

/**
 * Sections in the order to show them: the folder's own files first, then
 * the folders below it with later names first. Date folders ("2026-11-13")
 * therefore run newest first; other names simply run Z to A.
 */
export function orderSections(sections: PhotoSection[]): PhotoSection[] {
  return [...sections].sort((a, b) => {
    if (a.path.length === 0) return -1;
    if (b.path.length === 0) return 1;
    return b.path.join("/").localeCompare(a.path.join("/"));
  });
}

/**
 * The names below the work folder, from Graph's parent path
 * ("/drives/<id>/root:/Work Photos/Job/2026-11-13"), or null when the item
 * isn't inside the work folder at all.
 */
export function pathBelowRoot(parentPath: string | undefined, name: string, rootFolder: string): string[] | null {
  if (!parentPath) return null;
  const colon = parentPath.indexOf(":");
  if (colon < 0) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(parentPath.slice(colon + 1));
  } catch {
    decoded = parentPath.slice(colon + 1);
  }
  const full = [...decoded.split("/").filter(Boolean), name];
  const root = rootFolder.split("/").filter(Boolean);
  for (let i = 0; i < root.length; i++) {
    if (full[i]?.toLowerCase() !== root[i].toLowerCase()) return null;
  }
  return full.slice(root.length);
}

function toFile(item: GraphItem): PhotoFile | null {
  if (!item.id || !item.name || item.folder) return null;
  const kind = kindOf(item.name, item.file?.mimeType);
  if (!kind) return null;
  const thumbs = item.thumbnails?.[0];
  return {
    id: item.id,
    name: item.name,
    kind,
    takenAt: item.photo?.takenDateTime ?? item.createdDateTime ?? item.lastModifiedDateTime ?? null,
    size: item.size ?? null,
    thumbUrl: thumbs?.medium?.url ?? thumbs?.large?.url ?? null,
    largeUrl: thumbs?.large?.url ?? thumbs?.medium?.url ?? null,
  };
}

function toFolder(item: GraphItem): PhotoFolder | null {
  if (!item.id || !item.name || !item.folder) return null;
  return {
    id: item.id,
    name: item.name,
    modifiedAt: item.lastModifiedDateTime ?? null,
    childCount: item.folder.childCount ?? null,
  };
}

const SELECT = "id,name,size,folder,file,photo,createdDateTime,lastModifiedDateTime";

/** Everything directly in one folder, across pages. */
export async function listChildren(
  client: Client,
  driveId: string,
  folderId: string
): Promise<{ folders: PhotoFolder[]; files: PhotoFile[] }> {
  const folders: PhotoFolder[] = [];
  const files: PhotoFile[] = [];
  let request = client
    .api(`/drives/${driveId}/items/${folderId}/children`)
    .select(SELECT)
    .expand("thumbnails($select=medium,large)")
    .top(200);
  // A folder holds a day's photos, or a company's jobs: 50 pages is 10,000
  // entries, far past either, so reaching it means the paging has gone wrong.
  for (let page = 0; page < 50; page++) {
    const body = (await request.get()) as GraphPage;
    for (const item of body.value ?? []) {
      const folder = toFolder(item);
      if (folder) folders.push(folder);
      const file = toFile(item);
      if (file) files.push(file);
    }
    const next = body["@odata.nextLink"];
    if (!next) break;
    request = client.api(next);
  }
  return { folders, files: files.sort(newestFirst) };
}

export type PhotoRoot = { driveId: string; folderId: string; folder: string };

const roots = new Map<string, Promise<PhotoRoot>>();

/**
 * The library and work folder for a configuration. Looked up once per
 * server instance: the IDs don't change, and it is three requests.
 */
export function findPhotoRoot(
  client: Client,
  config: { siteUrl: string; libraryName: string; folder: string }
): Promise<PhotoRoot> {
  const key = `${config.siteUrl}|${config.libraryName}|${config.folder}`;
  let found = roots.get(key);
  if (!found) {
    found = (async () => {
      const siteId = await resolveSiteId(client, config.siteUrl);
      const driveId = await findDriveByName(client, siteId, config.libraryName);
      const path = config.folder.split("/").map(encodeURIComponent).join("/");
      const folder = (await client
        .api(`/drives/${driveId}/root:/${path}`)
        .select("id")
        .get()) as { id?: string };
      if (!folder.id) throw new Error(`Can't find the "${config.folder}" folder in ${config.libraryName}.`);
      return { driveId, folderId: folder.id, folder: config.folder };
    })();
    roots.set(key, found);
    // A failed lookup (someone without access, a passing fault) isn't kept.
    found.catch(() => roots.delete(key));
  }
  return found;
}

export type FolderInfo = { id: string; name: string; parentId: string | null; path: string[] };

/** A folder's name and place, or null when it isn't a folder inside the work folder. */
export async function getFolderInfo(
  client: Client,
  root: PhotoRoot,
  folderId: string
): Promise<FolderInfo | null> {
  if (folderId === root.folderId) return { id: folderId, name: "Photos", parentId: null, path: [] };
  const item = (await client
    .api(`/drives/${root.driveId}/items/${folderId}`)
    .select("id,name,folder,parentReference")
    .get()) as GraphItem & { parentReference?: { id?: string; path?: string } };
  if (!item.id || !item.name || !item.folder) return null;
  const path = pathBelowRoot(item.parentReference?.path, item.name, root.folder);
  if (!path || path.length === 0) return null;
  return { id: item.id, name: item.name, parentId: item.parentReference?.id ?? null, path };
}

/** How far below the shown folder is read, and how many folders in all. */
export const WALK_DEPTH = 3;
export const WALK_FOLDERS = 60;
const WALK_AT_ONCE = 6;

/**
 * A folder's photos together with those in the folders below it, so a job
 * shows every day's photos on one page. Reads at most WALK_FOLDERS folders,
 * WALK_DEPTH levels down, a few at a time; anything past that is listed in
 * `unread` to be opened on its own.
 */
export async function readFolder(
  folderId: string,
  list: (folderId: string) => Promise<{ folders: PhotoFolder[]; files: PhotoFile[] }>
): Promise<FolderView> {
  const sections: PhotoSection[] = [];
  const unread: FolderView["unread"] = [];
  let level: { id: string; path: string[] }[] = [{ id: folderId, path: [] }];
  let read = 0;

  for (let depth = 0; level.length > 0; depth++) {
    const next: { id: string; path: string[]; folder: PhotoFolder }[] = [];
    for (let i = 0; i < level.length; i += WALK_AT_ONCE) {
      const batch = level.slice(i, i + WALK_AT_ONCE);
      const results = await Promise.all(batch.map((entry) => list(entry.id)));
      results.forEach((result, index) => {
        const entry = batch[index];
        if (result.files.length > 0 || entry.path.length === 0) {
          sections.push({ path: entry.path, folderId: entry.id, files: result.files });
        }
        for (const folder of result.folders) {
          next.push({ id: folder.id, path: [...entry.path, folder.name], folder });
        }
      });
    }
    read += level.length;
    // Later names first, so when the budget runs out it is the oldest days left unread.
    next.sort((a, b) => b.path.join("/").localeCompare(a.path.join("/")));
    const room = depth + 1 > WALK_DEPTH ? 0 : Math.max(0, WALK_FOLDERS - read);
    for (const entry of next.slice(room)) unread.push({ ...entry.folder, path: entry.path });
    level = next.slice(0, room).map(({ id, path }) => ({ id, path }));
  }

  return { sections: orderSections(sections), unread };
}
