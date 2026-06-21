import { getGraphClient } from "@/lib/graph/client";

// Microsoft's documented scheme for turning a sharing URL into a Graph
// "shares" resource id: base64-encode the URL, swap to URL-safe characters,
// drop padding, and prefix with "u!".
// https://learn.microsoft.com/en-us/graph/api/shares-get
export function encodeSharingUrl(url: string): string {
  const base64 = Buffer.from(url, "utf-8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\//g, "_")
    .replace(/\+/g, "-");
  return `u!${base64}`;
}

type GraphList = {
  id: string;
  displayName?: string;
  webUrl?: string;
  parentReference?: { siteId?: string };
};

// Resolves a SharePoint "List" share link (the :l: format) to its site +
// list ids. Confirmed working via /shares/{id}/list — other relationships
// (driveItem, plain share) either error or don't carry the ids we need.
export async function resolveSharedList(
  url: string
): Promise<{ siteId: string; listId: string; displayName: string; webUrl: string }> {
  const client = await getGraphClient();
  const shareId = encodeSharingUrl(url);

  const list = (await client.api(`/shares/${shareId}/list`).get()) as GraphList;
  const siteId = list.parentReference?.siteId;
  if (!siteId) {
    throw new Error("Resolved list has no parentReference.siteId");
  }

  return {
    siteId,
    listId: list.id,
    displayName: list.displayName ?? "",
    webUrl: list.webUrl ?? "",
  };
}

export type ListColumn = {
  name: string;
  displayName: string;
  hidden?: boolean;
  readOnly?: boolean;
};

export async function getListColumns(
  siteId: string,
  listId: string
): Promise<ListColumn[]> {
  const client = await getGraphClient();
  const response = (await client
    .api(`/sites/${siteId}/lists/${listId}/columns`)
    .get()) as { value?: ListColumn[] };
  return response.value ?? [];
}

export type ListItem = { id: string; fields: Record<string, unknown> };

export async function getListItems(
  siteId: string,
  listId: string,
  top = 999
): Promise<ListItem[]> {
  const client = await getGraphClient();
  const response = (await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand("fields")
    .top(top)
    .get()) as { value?: { id: string; fields?: Record<string, unknown> }[] };
  return (response.value ?? []).map((item) => ({
    id: item.id,
    fields: item.fields ?? {},
  }));
}

// Microsoft Graph v1.0 has no documented endpoint for classic SharePoint
// list-item attachments (the kind this list's "Image"/"Attachments" columns
// use) — only modern document-library files have a driveItem relationship.
// This tries the plausible angles against one real item so we know for sure
// rather than guessing: site-level drives (to see if "Equipment Manuals" /
// "Controller Downloads" are real libraries reachable the normal way), and
// whether this specific item happens to expose a driveItem anyway.
export async function inspectListItemAttachments(
  siteId: string,
  listId: string,
  itemId: string
) {
  const client = await getGraphClient();
  const attempts: Record<string, unknown> = {};

  for (const [key, path] of [
    ["site_drives", `/sites/${siteId}/drives`],
    ["item_driveItem", `/sites/${siteId}/lists/${listId}/items/${itemId}/driveItem`],
    [
      "item_expand_driveItem",
      `/sites/${siteId}/lists/${listId}/items/${itemId}?$expand=driveItem`,
    ],
  ] as const) {
    try {
      attempts[key] = await client.api(path).get();
    } catch (err) {
      attempts[key] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return attempts;
}

// Diagnostic dump of every relationship that might resolve a list share
// link — kept around for re-inspecting if the list is ever moved/recreated
// and resolveSharedList() starts failing.
export async function inspectSharedListUrl(url: string) {
  const client = await getGraphClient();
  const shareId = encodeSharingUrl(url);

  const attempts: Record<string, unknown> = {};

  for (const [key, path] of [
    ["share_plain", `/shares/${shareId}`],
    ["share_expand_list_site", `/shares/${shareId}?$expand=list,site`],
    ["share_driveItem", `/shares/${shareId}/driveItem`],
    ["share_list", `/shares/${shareId}/list`],
  ] as const) {
    try {
      attempts[key] = await client.api(path).get();
    } catch (err) {
      attempts[key] = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return attempts;
}
