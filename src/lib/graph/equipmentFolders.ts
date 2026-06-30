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

export type FolderRef = { id: string; webUrl: string };

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

export async function resolveSiteId(client: Client, siteUrl: string): Promise<string> {
  const { hostname, relativePath } = parseSiteUrl(siteUrl);
  const path = relativePath
    ? `/sites/${hostname}:${relativePath}`
    : `/sites/${hostname}`;
  const site = (await client.api(path).get()) as { id?: string };
  if (!site.id) throw new Error(`Cannot resolve SharePoint site: ${siteUrl}`);
  return site.id;
}

export async function findDriveByName(
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
      `SharePoint library "${libraryName}" not found. Available: ${(response.value ?? []).map((d) => d.name).join(", ")}`
    );
  }
  return drive.id;
}

// Ensures a folder exists at the given path inside the drive root.
// cache maps already-confirmed paths to their FolderRef so parent segments
// (type folder, manufacturer folder) are not re-fetched for every equipment
// record in a batch run.
async function ensureFolderPath(
  client: Client,
  driveId: string,
  segments: string[],
  cache: Map<string, FolderRef>
): Promise<FolderRef> {
  const fullPath = segments.join("/");

  const hit = cache.get(fullPath);
  if (hit) return hit;

  // Optimistic GET of the full path (works when folder already exists)
  try {
    const item = (await client
      .api(`/drives/${driveId}/root:/${fullPath}`)
      .select("id,webUrl")
      .get()) as GraphDriveItem;
    const ref = { id: item.id, webUrl: item.webUrl ?? "" };
    cache.set(fullPath, ref);
    return ref;
  } catch (e: unknown) {
    if ((e as GraphErrorLike).statusCode !== 404) throw e;
  }

  // Walk each segment, creating any that are missing
  let currentPath = "";
  let lastItem: FolderRef = { id: "", webUrl: "" };

  for (const segment of segments) {
    const segmentPath = currentPath ? `${currentPath}/${segment}` : segment;

    const cached = cache.get(segmentPath);
    if (cached) {
      lastItem = cached;
      currentPath = segmentPath;
      continue;
    }

    try {
      const item = (await client
        .api(`/drives/${driveId}/root:/${segmentPath}`)
        .select("id,webUrl")
        .get()) as GraphDriveItem;
      lastItem = { id: item.id, webUrl: item.webUrl ?? "" };
      cache.set(segmentPath, lastItem);
    } catch (e: unknown) {
      if ((e as GraphErrorLike).statusCode !== 404) throw e;

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
        cache.set(segmentPath, lastItem);
      } catch (createErr: unknown) {
        // 409 = race: folder created between our GET and POST
        if ((createErr as GraphErrorLike).statusCode === 409) {
          const item = (await client
            .api(`/drives/${driveId}/root:/${segmentPath}`)
            .select("id,webUrl")
            .get()) as GraphDriveItem;
          lastItem = { id: item.id, webUrl: item.webUrl ?? "" };
          cache.set(segmentPath, lastItem);
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

// Single-record version — used by createEquipment(). Resolves site + drive
// internally so callers don't need to manage Graph state.
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

  return ensureFolderPath(client, driveId, [typeFolder, eq.manufacturer, eq.modelNumber], new Map());
}

// Batch version — resolves site + drive ONCE, then creates all folders in
// parallel (concurrency = 10) so the whole set completes in ~5-10 s instead
// of timing out when done sequentially. Each worker shares a path cache;
// the 409 recovery in ensureFolderPath handles concurrent parent-folder races.
export async function ensureEquipmentFolderBatch(
  items: EquipmentFolderInput[]
): Promise<Map<string, FolderRef | Error>> {
  const config = getEquipmentFolderConfig();
  if (!config) throw new Error("SHAREPOINT_EQUIPMENT_SITE_URL / SHAREPOINT_EQUIPMENT_LIBRARY not set");

  const client = await getGraphClient();
  const siteId = await resolveSiteId(client, config.siteUrl);
  const driveId = await findDriveByName(client, siteId, config.libraryName);

  const cache = new Map<string, FolderRef>();
  const CONCURRENCY = 10;

  async function processOne(item: EquipmentFolderInput): Promise<{ key: string; value: FolderRef | Error }> {
    const key = `${item.type}:${item.manufacturer}:${item.modelNumber}`;
    const typeFolder = TYPE_FOLDER[item.type];
    if (!typeFolder) return { key, value: new Error(`No folder mapping for type "${item.type}"`) };
    try {
      const ref = await ensureFolderPath(client, driveId, [typeFolder, item.manufacturer, item.modelNumber], cache);
      return { key, value: ref };
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.error(`[equipmentFolders] failed for ${key}:`, err.message, (e as Record<string, unknown>)?.statusCode, (e as Record<string, unknown>)?.body);
      return { key, value: err };
    }
  }

  const results = new Map<string, FolderRef | Error>();

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(processOne));
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.set(s.value.key, s.value.value);
      }
    }
  }

  return results;
}
