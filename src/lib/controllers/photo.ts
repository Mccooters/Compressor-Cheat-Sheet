import { isGraphConfigured } from "@/lib/graph/config";
import { getDriveItemDownloadUrl } from "@/lib/graph/sharepoint";

type PhotoDoc = {
  source: string;
  sharepointDriveId: string | null;
  sharepointItemId: string | null;
  webUrl: string;
};

// @microsoft.graph.downloadUrl is short-lived (~1hr) and pre-authenticated —
// usable directly in <img src>, unlike webUrl (SharePoint's viewer page, not
// the raw file). Always resolved fresh at render time, never cached, so it
// can't go stale in the database.
export async function resolveControllerPhotoSrc(
  photo: PhotoDoc
): Promise<string> {
  if (
    photo.source === "graph" &&
    photo.sharepointDriveId &&
    photo.sharepointItemId &&
    isGraphConfigured()
  ) {
    try {
      const downloadUrl = await getDriveItemDownloadUrl(
        photo.sharepointDriveId,
        photo.sharepointItemId
      );
      if (downloadUrl) return downloadUrl;
      console.error(
        "getDriveItemDownloadUrl returned no downloadUrl for",
        photo.sharepointItemId
      );
    } catch (err) {
      // Fall through to webUrl — still usable as a "view photo" link even
      // if it won't render as an inline <img>.
      console.error("Failed to resolve photo download URL:", err);
    }
  }
  return photo.webUrl;
}
