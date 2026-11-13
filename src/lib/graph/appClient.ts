import { Client } from "@microsoft/microsoft-graph-client";

/**
 * App-only (client-credentials) Graph access, for requests that have no
 * signed-in user — i.e. the mobile sync routes, where the caller is a phone
 * holding a bearer token rather than a Microsoft session.
 *
 * This is deliberately separate from getGraphClient() in ./client.ts, which
 * is delegated and acts as the signed-in user. Website pages must keep
 * using the delegated client so SharePoint permissions are still evaluated
 * per user; this one runs with application permissions
 * (Sites.Read.All / Files.Read.All) and sees everything the app
 * registration has been consented for. See docs/azure-ad-setup.md.
 */

type CachedToken = { token: string; expiresAt: number };

// Module scope: Vercel reuses a warm lambda across requests, so this avoids
// a token round-trip per document download.
let cached: CachedToken | null = null;

function tokenEndpoint(issuer: string): string {
  // The issuer is https://login.microsoftonline.com/{tenant}/v2.0 — same
  // derivation as the refresh path in src/auth.ts.
  return `${issuer.replace(/\/v2\.0\/?$/, "")}/oauth2/v2.0/token`;
}

export async function getAppGraphToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.token;

  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;

  if (!clientId || !clientSecret || !issuer) {
    throw new Error(
      "Microsoft Entra app credentials are not configured — set AUTH_MICROSOFT_ENTRA_ID_ID, _SECRET and _ISSUER."
    );
  }

  const response = await fetch(tokenEndpoint(issuer), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // The body carries Entra's error code (e.g. AADSTS7000215), which is the
    // only useful thing for diagnosing a misconfigured app registration.
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Entra client-credentials request failed (${response.status}): ${detail.slice(0, 500)}`
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("Entra returned no access_token.");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  // Refresh a minute early so a token can't expire mid-download.
  cached = {
    token: data.access_token,
    expiresAt: now + Math.max(expiresIn - 60, 0) * 1000,
  };

  return data.access_token;
}

/**
 * Base64url-encodes a sharing URL into a Graph share id (`u!...`).
 *
 * Deliberately duplicated from encodeSharingUrl() in ./lists.ts rather than
 * imported: that module pulls in the delegated client and, through it, the
 * Auth.js session stack. The whole point of this file is a Graph path that
 * never touches a user session, so the mobile routes keep it at arm's
 * length. Keep the two in sync — the encoding is fixed by Graph.
 */
export function encodeShareUrl(url: string): string {
  const base64 = Buffer.from(url, "utf-8")
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\//g, "_")
    .replace(/\+/g, "-");
  return `u!${base64}`;
}

export async function getAppGraphClient(): Promise<Client> {
  const token = await getAppGraphToken();
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}
