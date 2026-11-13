import { timingSafeEqual } from "node:crypto";

/**
 * Shared bearer-token check for the mobile sync routes (/api/snapshot and
 * /api/documents). These are excluded from the middleware auth redirect —
 * see middleware.ts — because the phone has no browser session to redirect,
 * so they authenticate themselves here instead.
 *
 * Returns null when the request is authorised, or the Response to return
 * as-is when it isn't. Never fails open: an unset MOBILE_API_TOKEN is a
 * 503, not an open door.
 */
export function checkMobileToken(request: Request): Response | null {
  const expected = process.env.MOBILE_API_TOKEN;
  if (!expected) {
    return mobileJson(
      { error: "Mobile API is not configured on this deployment." },
      503
    );
  }

  const header = request.headers.get("authorization");
  const supplied = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;
  if (!supplied) {
    return mobileJson({ error: "Unauthorized" }, 401);
  }

  const suppliedBytes = Buffer.from(supplied, "utf-8");
  const expectedBytes = Buffer.from(expected, "utf-8");

  // timingSafeEqual throws on length mismatch, so that has to be checked
  // first. It leaks the token's length only, which isn't useful on its own.
  if (suppliedBytes.length !== expectedBytes.length) {
    return mobileJson({ error: "Unauthorized" }, 401);
  }
  if (!timingSafeEqual(suppliedBytes, expectedBytes)) {
    return mobileJson({ error: "Unauthorized" }, 401);
  }

  return null;
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
