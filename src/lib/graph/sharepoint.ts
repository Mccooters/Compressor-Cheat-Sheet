import { ResponseType } from "@microsoft/microsoft-graph-client";
import { getGraphClient } from "@/lib/graph/client";

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

export async function searchDriveItems(query: string): Promise<SharePointHit[]> {
  const client = await getGraphClient();

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
