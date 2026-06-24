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
