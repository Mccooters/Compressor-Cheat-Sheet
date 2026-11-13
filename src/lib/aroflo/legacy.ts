import { createHmac } from "node:crypto";

/**
 * Client for AroFlo's older, HMAC-signed API (https://api.aroflo.com/).
 *
 * Used alongside the v2 client because it can do two things v2 cannot:
 * return each asset's barcode in list pages (so the tag register can be
 * rebuilt in a handful of calls), and list the documents attached to an
 * asset.
 *
 * The signing recipe mirrors the Air Assist iOS app and AirMark's
 * api/aroflo.js, and was checked against their worked examples. The signature covers the exact encoded bytes
 * sent, so the query string is built once here and never re-encoded.
 */

const ENDPOINT = "https://api.aroflo.com/";

export type LegacyCredentials = {
  secretKey: string;
  uEncoded: string;
  pEncoded: string;
  orgEncoded: string;
  hostIP?: string;
};

export type LegacyQuery = {
  zone: string;
  where?: string[];
  order?: string[];
  join?: string[];
  page: number;
  pageSize: number;
};

export class ArofloLegacyError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ArofloLegacyError";
  }
}

/** Pasted keys often carry whitespace or invisible characters, which AroFlo rejects. */
function clean(value: string | undefined): string {
  return (value ?? "").replace(/[\s\p{Cc}\p{Cf}]/gu, "");
}

export function legacyCredentialsFromEnv(): LegacyCredentials | null {
  const secretKey = clean(process.env.AROFLO_LEGACY_SECRET_KEY);
  const uEncoded = clean(process.env.AROFLO_LEGACY_U_ENCODED);
  const pEncoded = clean(process.env.AROFLO_LEGACY_P_ENCODED);
  const orgEncoded = clean(process.env.AROFLO_LEGACY_ORG_ENCODED);
  if (!secretKey || !uEncoded || !pEncoded || !orgEncoded) return null;
  const hostIP = clean(process.env.AROFLO_LEGACY_HOST_IP);
  return { secretKey, uEncoded, pEncoded, orgEncoded, ...(hostIP ? { hostIP } : {}) };
}

export function isLegacyConfigured(): boolean {
  return legacyCredentialsFromEnv() !== null;
}

/** zone, every where, every order, every join, page, pageSize — in that order. */
export function buildVarString(query: LegacyQuery): string {
  const pairs: [string, string][] = [
    ["zone", query.zone],
    ...(query.where ?? []).map((v): [string, string] => ["where", v]),
    ...(query.order ?? []).map((v): [string, string] => ["order", v]),
    ...(query.join ?? []).map((v): [string, string] => ["join", v]),
    ["page", String(query.page)],
    ["pageSize", String(query.pageSize)],
  ];
  return pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
}

export function buildAuthorization(credentials: LegacyCredentials): string {
  // The key casing is AroFlo's: "uencoded", "pencoded", "orgEncoded".
  return (
    `uencoded=${encodeURIComponent(credentials.uEncoded)}` +
    `&pencoded=${encodeURIComponent(credentials.pEncoded)}` +
    `&orgEncoded=${encodeURIComponent(credentials.orgEncoded)}`
  );
}

export function signRequest(
  credentials: LegacyCredentials,
  method: "GET" | "POST",
  timestamp: string,
  varString: string
): string {
  const parts = [
    method,
    ...(credentials.hostIP ? [credentials.hostIP] : []),
    // The empty part is real: with no hostIP the string starts "GET++text/json".
    "",
    "text/json",
    buildAuthorization(credentials),
    timestamp,
    varString,
  ];
  return createHmac("sha512", credentials.secretKey).update(parts.join("+")).digest("hex");
}

type LegacyEnvelope<T> = {
  status?: string | number;
  statusmessage?: string;
  zoneresponse?: T;
};

export async function legacyGet<T>(query: LegacyQuery): Promise<T> {
  const credentials = legacyCredentialsFromEnv();
  if (!credentials) {
    throw new ArofloLegacyError(503, "AroFlo legacy API credentials are not set.");
  }

  const varString = buildVarString(query);
  // A fresh timestamp and signature for every attempt.
  const timestamp = new Date().toISOString();

  const response = await fetch(`${ENDPOINT}?${varString}`, {
    headers: {
      Authentication: `HMAC ${signRequest(credentials, "GET", timestamp, varString)}`,
      Authorization: buildAuthorization(credentials),
      Accept: "text/json",
      afdatetimeutc: timestamp,
      ...(credentials.hostIP ? { HostIP: credentials.hostIP } : {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let body: LegacyEnvelope<T> | null = null;
  try {
    body = JSON.parse(text) as LegacyEnvelope<T>;
  } catch {
    // Fall through to the error below with the raw text.
  }

  const status = body?.status;
  const ok = response.ok && (status === undefined || String(status) === "0");
  if (!ok || !body?.zoneresponse) {
    throw new ArofloLegacyError(
      response.status,
      `AroFlo legacy ${query.zone} failed (${response.status}): ${
        body?.statusmessage ?? text.slice(0, 300)
      }`
    );
  }

  return body.zoneresponse;
}
