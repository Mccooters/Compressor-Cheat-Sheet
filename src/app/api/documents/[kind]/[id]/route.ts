import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentLink, pviResource, resource } from "@/db/schema";
import {
  encodeShareUrl,
  getAppGraphClient,
  getAppGraphToken,
} from "@/lib/graph/appClient";
import { checkMobileToken, mobileJson } from "@/lib/mobile/auth";
import { isProxyable, type DocumentKind } from "@/lib/mobile/urls";

/**
 * Streams a SharePoint-backed document to the iOS app.
 *
 * The phone has no Microsoft session, so this fetches with app-only Graph
 * credentials (see src/lib/graph/appClient.ts) and pipes the bytes back.
 * Office formats are converted to PDF on the way through, the same trick
 * getDriveItemAsPdf() uses for the website's resource viewer.
 *
 * Every failure path returns JSON. The app treats an HTML body or a
 * redirect as a failed download, so this route must never produce either —
 * including for rows that simply aren't proxyable.
 */
export const dynamic = "force-dynamic";

const VALID_KINDS = new Set<DocumentKind>(["document", "resource", "pvi"]);

// Formats Graph can render to PDF. Anything else is passed through as-is
// rather than guessed at — a failed conversion would break the download.
const OFFICE_EXTENSIONS = new Set([
  "doc", "docx", "dot", "dotx", "docm",
  "xls", "xlsx", "xlsm", "xlt", "xltx",
  "ppt", "pptx", "pps", "ppsx", "potx",
  "rtf", "odt", "ods", "odp",
]);

type ResolvedRow = {
  title: string;
  source: "graph" | "manual_link";
  sharepointDriveId: string | null;
  sharepointItemId: string | null;
  webUrl: string;
  fileName: string | null;
};

async function loadRow(
  kind: DocumentKind,
  id: string
): Promise<ResolvedRow | null> {
  if (kind === "document") {
    const row = await db.query.documentLink.findFirst({
      where: eq(documentLink.id, id),
    });
    return row
      ? {
          title: row.title,
          source: row.source,
          sharepointDriveId: row.sharepointDriveId,
          sharepointItemId: row.sharepointItemId,
          webUrl: row.webUrl,
          fileName: row.fileName,
        }
      : null;
  }

  if (kind === "resource") {
    const row = await db.query.resource.findFirst({
      where: eq(resource.id, id),
    });
    return row
      ? {
          title: row.title,
          source: row.source,
          sharepointDriveId: row.sharepointDriveId,
          sharepointItemId: row.sharepointItemId,
          webUrl: row.webUrl,
          fileName: row.fileName,
        }
      : null;
  }

  const row = await db.query.pviResource.findFirst({
    where: eq(pviResource.id, id),
  });
  return row
    ? {
        title: row.title,
        source: row.source,
        sharepointDriveId: row.sharepointDriveId,
        sharepointItemId: row.sharepointItemId,
        webUrl: row.webUrl,
        fileName: row.fileName,
      }
    : null;
}

/** Resolves a row to a Graph drive item, following a share link if needed. */
async function resolveDriveItem(row: ResolvedRow): Promise<{
  driveId: string;
  itemId: string;
  name: string;
  mimeType: string | null;
}> {
  const client = await getAppGraphClient();

  let driveId = row.sharepointDriveId;
  let itemId = row.sharepointItemId;

  if (!(row.source === "graph" && driveId && itemId)) {
    // A pasted SharePoint URL — resolve it to the underlying drive item.
    const shared = (await client
      .api(`/shares/${encodeShareUrl(row.webUrl)}/driveItem`)
      .get()) as {
      id?: string;
      name?: string;
      file?: { mimeType?: string };
      parentReference?: { driveId?: string };
    };

    driveId = shared.parentReference?.driveId ?? null;
    itemId = shared.id ?? null;
    if (!driveId || !itemId) {
      throw new Error("Share link did not resolve to a drive item.");
    }
    return {
      driveId,
      itemId,
      name: shared.name ?? row.fileName ?? row.title,
      mimeType: shared.file?.mimeType ?? null,
    };
  }

  const item = (await client.api(`/drives/${driveId}/items/${itemId}`).get()) as {
    name?: string;
    file?: { mimeType?: string };
  };

  return {
    driveId,
    itemId,
    name: item.name ?? row.fileName ?? row.title,
    mimeType: item.file?.mimeType ?? null,
  };
}

function extensionOf(name: string): string {
  const match = /\.([^./\\]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "";
}

/** RFC 6266: a quoted ASCII fallback plus a UTF-8 encoded real name. */
function contentDisposition(fileName: string): string {
  const ascii = fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "");
  const safeAscii = ascii.length > 0 ? ascii : "download";
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const denied = checkMobileToken(request);
  if (denied) return denied;

  const { kind, id } = await params;
  if (!VALID_KINDS.has(kind as DocumentKind)) {
    return mobileJson({ error: "Not found" }, 404);
  }

  try {
    const row = await loadRow(kind as DocumentKind, id);
    if (!row) {
      return mobileJson({ error: "Not found" }, 404);
    }

    // Plain external links have no bytes for us to serve. The snapshot never
    // points here for those, so this is a stale or hand-made request —
    // answer 404 rather than redirecting, which the app can't follow.
    if (!isProxyable(row)) {
      return mobileJson(
        { error: "Document is not stored in SharePoint" },
        404
      );
    }

    const item = await resolveDriveItem(row);
    const sourceExtension = extensionOf(item.name);
    const convertToPdf = OFFICE_EXTENSIONS.has(sourceExtension);

    const token = await getAppGraphToken();
    const contentUrl =
      `https://graph.microsoft.com/v1.0/drives/${item.driveId}/items/${item.itemId}/content` +
      (convertToPdf ? "?format=pdf" : "");

    // Graph answers /content with a 302 to a short-lived pre-authenticated
    // storage URL. Follow it by hand: re-sending the Authorization header to
    // that host is both unnecessary and rejected by some endpoints.
    let contentResponse = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
      cache: "no-store",
    });

    const location = contentResponse.headers.get("location");
    if (
      contentResponse.status >= 300 &&
      contentResponse.status < 400 &&
      location
    ) {
      contentResponse = await fetch(location, { cache: "no-store" });
    }

    if (!contentResponse.ok || !contentResponse.body) {
      const detail = await contentResponse.text().catch(() => "");
      console.error(
        `Graph content fetch failed (${contentResponse.status}):`,
        detail.slice(0, 500)
      );
      return mobileJson(
        { error: "Failed to fetch document from SharePoint" },
        502
      );
    }

    const baseName = item.name.replace(/\.[^./\\]+$/, "");
    const extension = convertToPdf ? "pdf" : sourceExtension;
    const fileName = extension ? `${baseName}.${extension}` : baseName;

    const contentType = convertToPdf
      ? "application/pdf"
      : (item.mimeType ??
        contentResponse.headers.get("content-type") ??
        "application/octet-stream");

    const headers = new Headers({
      "Content-Type": contentType,
      // The app takes the file's extension from this header, so it has to
      // reflect the converted format, not the original.
      "Content-Disposition": contentDisposition(fileName),
      "Cache-Control": "private, no-store",
    });

    const contentLength = contentResponse.headers.get("content-length");
    if (contentLength && !convertToPdf) {
      headers.set("Content-Length", contentLength);
    }

    // Stream straight through rather than buffering the whole file.
    return new Response(contentResponse.body, { status: 200, headers });
  } catch (err) {
    console.error(`Failed to serve document ${kind}/${id}:`, err);
    return mobileJson({ error: "Failed to serve document" }, 500);
  }
}
