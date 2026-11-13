import { NextResponse } from "next/server";
import { auth } from "@/auth";

// NOTE ON THIS FILE'S NAME AND LOCATION — both matter, silently.
//
// Next 16 renamed the `middleware` convention to `proxy`, and when a project
// uses a `src` directory the file must live at `src/proxy.ts`. This was
// previously `middleware.ts` in the project root, where Next 16 does not look
// for it at all: it was never loaded, so nothing here ran and every page was
// served unauthenticated. There is no warning for this — the only symptom is
// that the auth gate quietly stops existing. Do not move it back to the root.

// Asset-tag URLs printed on equipment stickers: /a/{id}. The QR encodes
// them entirely in uppercase (HTTPS://AIRASSIST.COM.AU/A/AAC-CMP-0001) so
// the code uses QR alphanumeric mode, which is ~31% denser and prints one
// version smaller. Scheme and host are case-insensitive per RFC 3986, but
// the PATH is not, and Next's router is case-sensitive too — so /A/... has
// to be folded to /a/... here or it 404s before reaching the page.
const ASSET_PATH = /^\/a(\/.*)?$/i;

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const assetPath = ASSET_PATH.exec(pathname);
  if (assetPath) {
    const canonical = `/a${assetPath[1] ?? ""}`;
    if (pathname !== canonical) {
      const url = req.nextUrl.clone();
      url.pathname = canonical;
      // Rewrite, not redirect: these are scanned on a phone in a plant room,
      // often on one bar of signal, where an extra round trip is felt.
      return NextResponse.rewrite(url);
    }
    // Public by design — anyone who can physically reach the equipment can
    // scan the sticker, including customers and auditors with no login.
    return;
  }
  // Calculators are plain client-side math with no auth/DB dependency, and
  // are public on purpose: they're installable as an offline PWA, and a
  // login gate would defeat the point since you can't authenticate without
  // a network connection.
  // /.well-known/ is the standard namespace for machine-readable site
  // metadata (RFC 8615) and is public by definition. Apple's Universal Links
  // validator fetches /.well-known/apple-app-site-association and REJECTS
  // any redirect, so a login bounce here doesn't fail loudly — it just
  // silently stops asset-tag QR codes opening in the iOS app.
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/calculators") ||
    pathname.startsWith("/.well-known/");

  // Only a lightweight JWT check here — no DB access. Middleware/proxy runs
  // in a separate, minimal execution context that isn't meant to depend on
  // shared modules like a DB connection pool; the admin-only restriction on
  // /admin is enforced in that segment's layout instead, plus requireAdmin()
  // in every mutating server action regardless.
  if (!isPublicRoute && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Run on (almost) every route, not just /admin. Server Components can't
  // set cookies, so the jwt callback's Microsoft token refresh only gets
  // persisted back to the browser when auth() runs as middleware — without
  // broad coverage here, a refreshed token is discarded after one render
  // and SharePoint-backed photos/links break again on the next request.
  //
  // api/snapshot, api/documents and api/asset-tags are excluded because they
  // serve the iOS app, which holds a bearer token rather than a browser
  // session: the redirect above would answer its request with a 302 to the
  // login page, and an HTML body is exactly what the app reads as a failed
  // sync. They authenticate themselves — see src/lib/mobile/auth.ts.
  // api/cron is called by Vercel's scheduler and checks CRON_SECRET itself.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/snapshot|api/documents|api/asset-tags|api/cron|sw.js|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
