import type { Client } from "@microsoft/microsoft-graph-client";
import { getGraphClient } from "@/lib/graph/client";
import { getEquipmentFolderConfig } from "@/lib/graph/config";
import type { EquipmentType } from "@/lib/equipment/specSchemas";

// Maps equipment DB types to the folder names used in SharePoint.
const TYPE_FOLDER: Record<EquipmentType, string> = {
  compressor: "Compressors",
  dryer: "Dryer",
  controller: "Controllers",
  line_filter: "Line Filters",
  breathing_air: "Breathing Air",
  oily_water_separator: "Oily Water Separators",
  vacuum_pump: "Vacuum Pumps",
  generator: "Generators",
  nitrogen_generator: "Nitrogen Generators",
};

type FolderRef = { id: string; webUrl: string };

type GraphDriveItem = { id: string; webUrl?: string };
type GraphDriveList = { value?: { id: string; name?: string }[] };
type GraphErrorLike = { statusCode?: number };
type GraphChildrenBody = {
  name: string;
  folder: Record<string, never>;
  "@microsoft.graph.conflictBehavior": string;
};

function parseSiteUrl(url: string): { hostname: string; relativePath: string } {
  const parsed = new URL(url);
  return {
    hostname: parsed.hostname,
    relativePath: parsed.pathname.replace(/\/+$/, ""),
  };
}

async function resolveSiteId(client: Client, siteUrl: string): Promise<string> {
  const { hostname, relativePath } = parseSiteUrl(siteUrl);
  const path = relativePath
    ? `/sites/${hostname}:${relativePath}`
    : `/sites/${hostname}`;
  const site = (await client.api(path).get()) as { id?: string };
  if (!site.id) throw new Error(`Cannot resolve SharePoint site: ${siteUrl}`);
  return site.id;
}

async function findDriveByName(
  client: Client,
  siteId: string,
  libraryName: string
): Promise<string> {
  const response = (await client
    .api(`/sites/${siteId}/drives`)
    .select("id,name")
    .get()) as GraphDriveList;

  const drive = (response.value ?? []).find(
    (d) => d.name?.toLowerCase() === libraryName.toLowerCase()
  );
  if (!drive) {
    throw new Error(
      `SharePoint library "${libraryName}" not found in site. Available: ${(response.value ?? []).map((d) => d.name).join(", ")}`
    );
  }
  return drive.id;
}

// Ensures a folder exists at the given path inside the drive root.
// Tries GET first; if 404, creates each path segment in sequence.
async function ensureFolderPath(
  client: Client,
  driveId: string,
  segments: string[]
): Promise<FolderRef> {
  const fullPath = segments.join("/");

  // Optimistic GET of the full path
  try {
    const item = (await client
      .api(`/drives/${driveId}/root:/${fullPath}`)
      .select("id,webUrl")
      .get()) as GraphDriveItem;
    return { id: item.id, webUrl: item.webUrl ?? "" };
  } catch (e: unknown) {
    if ((e as GraphErrorLike).statusCode !== 404) throw e;
  }

  // Walk segments, creating any that are missing
  let currentPath = "";
  let lastItem: FolderRef = { id: "", webUrl: "" };

  for (const segment of segments) {
    const segmentPath = currentPath ? `${currentPath}/${segment}` : segment;

    try {
      const item = (await client
        .api(`/drives/${driveId}/root:/${segmentPath}`)
        .select("id,webUrl")
        .get()) as GraphDriveItem;
      lastItem = { id: item.id, webUrl: item.webUrl ?? "" };
    } catch (e: unknown) {
      if ((e as GraphErrorLike).statusCode !== 404) throw e;

      // Create this segment under the current parent
      const parentApi = currentPath
        ? `/drives/${driveId}/root:/${currentPath}:/children`
        : `/drives/${driveId}/root/children`;

      const body: GraphChildrenBody = {
        name: segment,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      };

      try {
        const created = (await client.api(parentApi).post(body)) as GraphDriveItem;
        lastItem = { id: created.id, webUrl: created.webUrl ?? "" };
      } catch (createErr: unknown) {
        // 409 = race: another request created it between our GET and POST
        if ((createErr as GraphErrorLike).statusCode === 409) {
          const item = (await client
            .api(`/drives/${driveId}/root:/${segmentPath}`)
            .select("id,webUrl")
            .get()) as GraphDriveItem;
          lastItem = { id: item.id, webUrl: item.webUrl ?? "" };
        } else {
          throw createErr;
        }
      }
    }

    currentPath = segmentPath;
  }

  return lastItem;
}

export type EquipmentFolderInput = {
  type: EquipmentType;
  manufacturer: string;
  modelNumber: string;
};

// Returns { id, webUrl } of the Equipment Manuals/{TypeFolder}/{Manufacturer}/{ModelNumber}
// folder, creating any missing segments along the way.
// Returns null if SHAREPOINT_EQUIPMENT_SITE_URL / SHAREPOINT_EQUIPMENT_LIBRARY are not set,
// or if the caller is not signed in with Microsoft (Graph will throw).
export async function ensureEquipmentFolder(
  eq: EquipmentFolderInput
): Promise<FolderRef | null> {
  const config = getEquipmentFolderConfig();
  if (!config) return null;

  const typeFolder = TYPE_FOLDER[eq.type];
  if (!typeFolder) return null;

  const client = await getGraphClient();
  const siteId = await resolveSiteId(client, config.siteUrl);
  const driveId = await findDriveByName(client, siteId, config.libraryName);

  return ensureFolderPath(client, driveId, [
    typeFolder,
    eq.manufacturer,
    eq.modelNumber,
  ]);
}
