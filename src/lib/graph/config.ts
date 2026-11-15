export function isEntraConfigured() {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
  );
}

// Graph access piggybacks on the same Entra ID app registration used for
// sign-in (delegated permissions), so "Graph configured" and "Microsoft
// sign-in available" are the same condition for this app.
export function isGraphConfigured() {
  return isEntraConfigured();
}

export function isDevLoginEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_DEV_LOGIN_ENABLED === "true"
  );
}

// Comma-separated SharePoint site URLs (e.g. "https://contoso.sharepoint.com/sites/Engineering").
// Restricts the "Search SharePoint" pickers to just these sites instead of
// the whole tenant. Leave unset to search everywhere the signed-in user has
// access, as before.
export function getSearchSiteUrls(): string[] {
  const raw = process.env.SHAREPOINT_SEARCH_SITE_URLS ?? "";
  return raw
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

// SharePoint site and drive library used for equipment folder auto-creation.
// SHAREPOINT_EQUIPMENT_SITE_URL — full URL to the Operations site
//   e.g. "https://adaptiveaircompressors.sharepoint.com/sites/Operations"
// SHAREPOINT_EQUIPMENT_LIBRARY — display name of the document library
//   e.g. "Equipment Manuals"
export function getEquipmentFolderConfig(): {
  siteUrl: string;
  libraryName: string;
} | null {
  const siteUrl = process.env.SHAREPOINT_EQUIPMENT_SITE_URL?.trim().replace(/\/+$/, "");
  const libraryName = process.env.SHAREPOINT_EQUIPMENT_LIBRARY?.trim();
  if (!siteUrl || !libraryName) return null;
  return { siteUrl, libraryName };
}

// Where the Air Assist app keeps job photos: a folder in a SharePoint
// document library (the app's "SharePoint only" work folder). The website
// reads it as the signed-in person, so SharePoint's permissions still apply.
//
// SHAREPOINT_PHOTOS_SITE_URL — the site holding the library. Defaults to
//   SHAREPOINT_EQUIPMENT_SITE_URL: both live on the Operations site.
// SHAREPOINT_PHOTOS_LIBRARY — the library's display name
//   (default "Operational Documents").
// SHAREPOINT_PHOTOS_FOLDER — the work folder inside it (default "Work Photos").
export function getPhotosConfig(): {
  siteUrl: string;
  libraryName: string;
  folder: string;
} | null {
  const siteUrl = (
    process.env.SHAREPOINT_PHOTOS_SITE_URL ?? process.env.SHAREPOINT_EQUIPMENT_SITE_URL
  )
    ?.trim()
    .replace(/\/+$/, "");
  if (!siteUrl) return null;
  return {
    siteUrl,
    libraryName: process.env.SHAREPOINT_PHOTOS_LIBRARY?.trim() || "Operational Documents",
    folder: (process.env.SHAREPOINT_PHOTOS_FOLDER?.trim() || "Work Photos").replace(
      /^\/+|\/+$/g,
      ""
    ),
  };
}
