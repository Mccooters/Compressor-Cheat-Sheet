/**
 * URL rewriting for the mobile snapshot.
 *
 * Anything stored in SharePoint — whether linked through Graph or pasted in
 * as a share URL — is unreachable from the phone, which has no Microsoft
 * session. Those rows get their webUrl rewritten to our own
 * /api/documents/... proxy, which fetches the bytes with app-only Graph
 * credentials. The original URL is kept as browserUrl so the app can still
 * offer "open in SharePoint" when there is a connection.
 *
 * Plain external links are left exactly as they are.
 */

export type DocumentKind = "document" | "resource" | "pvi";

export type ProxyCandidate = {
  kind: DocumentKind;
  id: string;
  source: "graph" | "manual_link";
  sharepointDriveId: string | null;
  sharepointItemId: string | null;
  webUrl: string;
  /** document_link only — used to bust the app's cached copy. */
  lastModifiedAt?: Date | null;
};

export function isSharePointUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().endsWith(".sharepoint.com");
  } catch {
    return false;
  }
}

/** True when we can serve this row's bytes through /api/documents. */
export function isProxyable(item: {
  source: "graph" | "manual_link";
  sharepointDriveId: string | null;
  sharepointItemId: string | null;
  webUrl: string;
}): boolean {
  if (item.source === "graph") {
    return Boolean(item.sharepointDriveId && item.sharepointItemId);
  }
  return isSharePointUrl(item.webUrl);
}

export function buildDocumentUrls(
  origin: string,
  item: ProxyCandidate
): { webUrl: string; browserUrl: string | null } {
  if (!isProxyable(item)) {
    return { webUrl: item.webUrl, browserUrl: null };
  }

  let proxied = `${origin}/api/documents/${item.kind}/${item.id}`;

  // Only document_link carries a lastModifiedAt. The app compares this
  // query value against its cached copy to decide whether to re-download,
  // so it must change whenever the underlying file does.
  if (item.kind === "document" && item.lastModifiedAt) {
    proxied += `?v=${encodeURIComponent(item.lastModifiedAt.toISOString())}`;
  }

  return { webUrl: proxied, browserUrl: item.webUrl };
}
