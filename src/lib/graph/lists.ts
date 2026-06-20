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

// SharePoint "List" share links (the :l: format) don't resolve the same way
// document links do — there's no single documented relationship that's
// guaranteed to come back populated, so this tries several and returns
// whatever each call actually yields for inspection rather than assuming
// one shape.
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

export async function getListColumns(siteId: string, listId: string) {
  const client = await getGraphClient();
  const response = (await client
    .api(`/sites/${siteId}/lists/${listId}/columns`)
    .get()) as { value?: { name?: string; displayName?: string }[] };
  return response.value ?? [];
}

export async function getListItems(siteId: string, listId: string) {
  const client = await getGraphClient();
  const response = (await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand("fields")
    .top(50)
    .get()) as { value?: { id: string; fields?: Record<string, unknown> }[] };
  return response.value ?? [];
}
