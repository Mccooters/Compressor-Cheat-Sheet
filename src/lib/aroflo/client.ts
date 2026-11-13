/**
 * Minimal read-only client for the AroFlo API (v2, Bearer token).
 *
 * AroFlo meters this API per token: 120 requests a minute and 5,000 a day,
 * shared with anything else using the same token. Every call site should be
 * able to say why its request is worth one of those — prefer `revalidate`
 * caching over refetching, and never loop over the whole asset list.
 *
 * Note a rate-limited request comes back as 401 with a `minute_limit` /
 * `daily_limit` detail, not 429.
 */

const BASE_URL = "https://api.aroflo.com/v2";

export class ArofloError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ArofloError";
  }
}

export function isArofloConfigured(): boolean {
  return Boolean(process.env.AROFLO_API_TOKEN);
}

export async function arofloGet<T>(
  path: string,
  options: { revalidateSeconds?: number } = {}
): Promise<T> {
  const token = process.env.AROFLO_API_TOKEN;
  if (!token) {
    throw new ArofloError(503, "AROFLO_API_TOKEN is not set.");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    ...(options.revalidateSeconds
      ? { next: { revalidate: options.revalidateSeconds } }
      : { cache: "no-store" as const }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ArofloError(
      response.status,
      `AroFlo GET ${path.split("?")[0]} failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  return (await response.json()) as T;
}

export async function arofloPost<T>(path: string, body: unknown): Promise<T> {
  const token = process.env.AROFLO_API_TOKEN;
  if (!token) {
    throw new ArofloError(503, "AROFLO_API_TOKEN is not set.");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ArofloError(
      response.status,
      `AroFlo POST ${path} failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  return (await response.json()) as T;
}
