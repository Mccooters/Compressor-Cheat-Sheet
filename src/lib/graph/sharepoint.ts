import { Client, ResponseType } from "@microsoft/microsoft-graph-client";
import { getGraphClient } from "@/lib/graph/client";
import { getSearchSiteUrls } from "@/lib/graph/config";

export type SharePointHit = {
  driveId: string;
  itemId: string;
  name: string;
  webUrl: string;
  lastModifiedDateTime?: string;
};

type GraphSearchResponse = {
  value?: {
    hitsContainers?: {
      hits?: {
        resource?: {
          id?: string;
          name?: string;
          webUrl?: string;
          lastModifiedDateTime?: string;
          parentReference?: { driveId?: string };
        };
      }[];
    }[];
  }[];
};

type GraphDriveItem = {
  id: string;
  name?: string;
  webUrl?: string;
  lastModifiedDateTime?: string;
  folder?: unknown;
};

function parseSiteUrl(url: string): { hostname: string; relativePath: string } {
  const parsed = new URL(url);
  return { hostname: parsed.hostname, relativePath: parsed.pathname.replace(/\/+$/, "") };
}

async function resolveSiteId(
  client: Client,
  hostname: string,
  relativePath: string
): Promise<string> {
  const path = relativePath ? `/sites/${hostname}:${relativePath}` : `/sites/${hostname}`;
  const site = (await client.api(path).get()) as { id?: string };
  if (!site.id) {
    throw new Error(`Could not resolve SharePoint site: ${hostname}${relativePath}`);
  }
  return site.id;
}

async function getSiteDriveIds(client: Client, siteId: string): Promise<string[]> {
  const response = (await client
    .api(`/sites/${siteId}/drives`)
    .select("id")
    .get()) as { value?: { id: string }[] };
  return (response.value ?? []).map((d) => d.id);
}

// Microsoft Search's tenant-wide /search/query has no reliable way to limit
// results to a handful of sites: KQL's path: restriction is a string-prefix
// match, so a site at the tenant root matches every other site too (their
// URLs all start with the root site's URL). Resolving each configured site
// to its drives and searching those directly is the only way to actually
// exclude everything else.
async function searchScopedToSites(
  client: Client,
  query: string,
  siteUrls: string[]
): Promise<SharePointHit[]> {
  const siteIds = await Promise.all(
    siteUrls.map((url) => {
      const { hostname, relativePath } = parseSiteUrl(url);
      return resolveSiteId(client, hostname, relativePath);
    })
  );
  const driveIdLists = await Promise.all(
    siteIds.map((siteId) => getSiteDriveIds(client, siteId))
  );
  const driveIds = [...new Set(driveIdLists.flat())];

  const escapedQuery = query.replace(/'/g, "''");
  const driveResults = await Promise.all(
    driveIds.map((driveId) =>
      client
        .api(`/drives/${driveId}/root/search(q='${escapedQuery}')`)
        .top(25)
        .get()
        .catch(() => ({ value: [] as GraphDriveItem[] })) as Promise<{
        value?: GraphDriveItem[];
      }>
    )
  );

  const hits: SharePointHit[] = [];
  const seen = new Set<string>();
  driveResults.forEach((result, index) => {
    for (const item of result.value ?? []) {
      if (item.folder || seen.has(item.id)) continue;
      seen.add(item.id);
      hits.push({
        driveId: driveIds[index],
        itemId: item.id,
        name: item.name ?? "Untitled",
        webUrl: item.webUrl ?? "",
        lastModifiedDateTime: item.lastModifiedDateTime,
      });
    }
  });
  return hits.slice(0, 25);
}

export async function searchDriveItems(query: string): Promise<SharePointHit[]> {
  const client = await getGraphClient();

  const siteUrls = getSearchSiteUrls();
  if (siteUrls.length) {
    return searchScopedToSites(client, query, siteUrls);
  }

  const response = (await client.api("/search/query").post({
    requests: [
      {
        entityTypes: ["driveItem"],
        query: { queryString: query },
        from: 0,
        size: 25,
      },
    ],
  })) as GraphSearchResponse;

  const hits = response.value?.[0]?.hitsContainers?.[0]?.hits ?? [];

  return hits
    .map((hit) => hit.resource)
    .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource?.id))
    .map((resource) => ({
      driveId: resource.parentReference?.driveId ?? "",
      itemId: resource.id ?? "",
      name: resource.name ?? "Untitled",
      webUrl: resource.webUrl ?? "",
      lastModifiedDateTime: resource.lastModifiedDateTime,
    }));
}

export async function getDriveItemMetadata(driveId: string, itemId: string) {
  const client = await getGraphClient();
  const item = (await client.api(`/drives/${driveId}/items/${itemId}`).get()) as {
    name?: string;
    webUrl?: string;
    lastModifiedDateTime?: string;
  };

  return {
    name: item.name ?? "Untitled",
    webUrl: item.webUrl ?? "",
    lastModifiedDateTime: item.lastModifiedDateTime,
  };
}

// "@microsoft.graph.downloadUrl" is a short-lived (~1hr), pre-authenticated
// direct-content URL — usable straight in an <img src>, unlike webUrl (which
// opens SharePoint's viewer page, not the raw file). Always fetch fresh at
// render time rather than caching it in the database.
export async function getDriveItemDownloadUrl(
  driveId: string,
  itemId: string
): Promise<string | null> {
  const client = await getGraphClient();
  const item = (await client.api(`/drives/${driveId}/items/${itemId}`).get()) as {
    "@microsoft.graph.downloadUrl"?: string;
  };
  return item["@microsoft.graph.downloadUrl"] ?? null;
}

// Graph can convert Office formats (docx, xlsx, pptx, etc.) to PDF on the fly
// via the format query param on /content — there's no separate metadata
// endpoint for it, so this fetches the converted bytes directly rather than
// resolving a download URL like getDriveItemDownloadUrl does.
export async function getDriveItemAsPdf(
  driveId: string,
  itemId: string
): Promise<ArrayBuffer> {
  const client = await getGraphClient();
  return client
    .api(`/drives/${driveId}/items/${itemId}/content`)
    .query({ format: "pdf" })
    .responseType(ResponseType.ARRAYBUFFER)
    .get();
}
