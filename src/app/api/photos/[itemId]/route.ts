import { hasRole } from "@/lib/auth/access";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { pathBelowRoot } from "@/lib/photos/library";
import { openPhotoLibrary } from "@/lib/photos/open";

export const dynamic = "force-dynamic";

// One photo's file, for the Photos pages: the original (to download), or
// with ?view=1 a screen-sized copy for the viewer.
//
// Answers with a redirect to a short-lived address SharePoint issues for
// that one file, so the bytes go from SharePoint to the browser and never
// through this site. Only Staff and Admins, only as the signed-in person
// (SharePoint decides whether they may read it), and only files inside the
// photo folder: this is not a way to fetch anything else in the library.

type Item = {
  name?: string;
  file?: unknown;
  parentReference?: { path?: string };
  "@microsoft.graph.downloadUrl"?: string;
};

/** The largest side of the copy shown in the viewer. */
const VIEW_SIZE = "c1600x1600";

function plain(message: string, status: number): Response {
  return new Response(message, { status, headers: { "cache-control": "private, no-store" } });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  if (!hasRole(await getCurrentUserRole(), "staff")) return plain("Photos are for Staff and Admins.", 403);

  const { itemId } = await params;
  if (!/^[A-Za-z0-9!_-]{1,200}$/.test(itemId)) return plain("Not found", 404);

  const library = await openPhotoLibrary();
  if (!library.ok) return plain(library.title, 503);
  const { client, root } = library;

  try {
    const item = (await client.api(`/drives/${root.driveId}/items/${itemId}`).get()) as Item;
    if (!item.name || !item.file || !pathBelowRoot(item.parentReference?.path, item.name, root.folder)) {
      return plain("Not found", 404);
    }

    let target = item["@microsoft.graph.downloadUrl"];
    if (new URL(request.url).searchParams.has("view")) {
      // A screen-sized copy, when SharePoint can make one; else the original.
      const sized = (await client
        .api(`/drives/${root.driveId}/items/${itemId}/thumbnails`)
        .select(VIEW_SIZE)
        .get()
        .catch(() => null)) as { value?: Record<string, { url?: string }>[] } | null;
      target = sized?.value?.[0]?.[VIEW_SIZE]?.url ?? target;
    }
    if (!target) return plain("SharePoint didn't give an address for this file.", 502);

    return new Response(null, {
      status: 302,
      headers: { location: target, "cache-control": "private, no-store" },
    });
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode === 404) return plain("Not found", 404);
    console.error("Couldn't open a photo:", err);
    return plain("Couldn't open the photo.", 502);
  }
}
