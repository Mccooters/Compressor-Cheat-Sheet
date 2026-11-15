import type { Client } from "@microsoft/microsoft-graph-client";
import { getGraphClient } from "@/lib/graph/client";
import { getPhotosConfig } from "@/lib/graph/config";
import { findPhotoRoot, type PhotoRoot } from "@/lib/photos/library";

export type OpenLibrary =
  | { ok: true; client: Client; root: PhotoRoot }
  | { ok: false; title: string; detail: string };

/**
 * The photo library as the signed-in person sees it, or a plain reason it
 * can't be opened. Reads use that person's own Microsoft sign-in, so
 * someone SharePoint doesn't let into the library gets nothing here either.
 */
export async function openPhotoLibrary(): Promise<OpenLibrary> {
  const config = getPhotosConfig();
  if (!config) {
    return {
      ok: false,
      title: "Photos aren't set up",
      detail: "The site doesn't know which SharePoint site holds the photos (SHAREPOINT_PHOTOS_SITE_URL).",
    };
  }

  let client: Client;
  try {
    client = await getGraphClient();
  } catch (err) {
    return {
      ok: false,
      title: "Sign in with Microsoft again",
      detail: err instanceof Error ? err.message : "Your Microsoft session has ended.",
    };
  }

  try {
    return { ok: true, client, root: await findPhotoRoot(client, config) };
  } catch (err) {
    console.error("Couldn't open the photo library:", err);
    return {
      ok: false,
      title: "Can't open the photo library",
      detail: `Looked for the "${config.folder}" folder in the "${config.libraryName}" library. Either your Microsoft account isn't allowed into it, or it has been moved or renamed.`,
    };
  }
}
