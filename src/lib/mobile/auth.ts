import { timingSafeEqual } from "node:crypto";
import { hasActiveMobileTokens, isActiveMobileToken } from "@/lib/mobile/tokens";

/**
 * Bearer-token check for the apps' routes (/api/snapshot, /api/documents,
 * /api/asset-tags, /api/assets). These are excluded from the request gate's
 * login redirect (see src/proxy.ts) because a phone has no browser session
 * to redirect, so they authenticate themselves here instead.
 *
 * Two kinds of token are accepted: a phone's own (src/lib/mobile/tokens.ts),
 * and the older shared MOBILE_API_TOKEN while that is still set.
 *
 * Returns null when the request is authorised, or the Response to return
 * as-is when it isn't. Never fails open: with no shared token and no phone
 * tokens it is a 503, not an open door, and a database fault while checking
 * is a 503 too.
 */
export async function checkMobileToken(request: Request): Promise<Response | null> {
  const header = request.headers.get("authorization");
  const supplied = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;

  // The shared token every phone used to carry. Still accepted while it is
  // set, so phones keep working while each is moved to a token of its own;
  // removing MOBILE_API_TOKEN from the deployment retires it.
  const shared = process.env.MOBILE_API_TOKEN;
  if (supplied && shared && sameBytes(supplied, shared)) return null;

  try {
    // A phone's own token, made and revoked from /admin/phones.
    if (supplied && (await isActiveMobileToken(supplied))) return null;
    if (!shared && !(await hasActiveMobileTokens())) {
      return mobileJson(
        { error: "Mobile API is not configured on this deployment." },
        503
      );
    }
  } catch (err) {
    console.error("Couldn't check a phone's access token:", err);
    return mobileJson({ error: "Couldn't check the access token." }, 503);
  }

  return mobileJson({ error: "Unauthorized" }, 401);
}

// Length is checked first because timingSafeEqual throws on a mismatch; the
// length of the secret is not itself worth hiding.
function sameBytes(supplied: string, expected: string): boolean {
  const suppliedBytes = Buffer.from(supplied, "utf-8");
  const expectedBytes = Buffer.from(expected, "utf-8");
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

/**
 * JSON helper for the mobile routes. The iOS client treats any HTML body as
 * a failed sync, so every response from these routes — errors included —
 * must go through here rather than returning a page or a redirect.
 */
export function mobileJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
