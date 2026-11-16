import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUseSite } from "@/lib/auth/access";

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
  // The asset pages above are the only pages the public can see. The
  // calculators used to be public too; they now need a sign-in like the
  // rest. They still work offline once opened while signed in: the service
  // worker (public/sw.js) serves its saved copies when there's no signal.
  //
  // /.well-known/ is the standard namespace for machine-readable site
  // metadata (RFC 8615) and is public by definition. Apple's Universal Links
  // validator fetches /.well-known/apple-app-site-association and REJECTS
  // any redirect, so a login bounce here doesn't fail loudly — it just
  // silently stops asset-tag QR codes opening in the iOS app.
  // /no-access is where someone who has signed in but isn't approved (or
  // has been removed) is sent; it has to be reachable by exactly them.
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/no-access" ||
    pathname.startsWith("/.well-known/");

  // The session cookie is checked here, and with it the person's role. The
  // role is read from the database by the jwt callback in src/auth.ts, at
  // most once a minute per signed-in browser (every request for someone
  // still waiting for approval); in between it rides in the cookie, so most
  // requests cost no database round trip. Proxy runs separately from the
  // pages, with its own copy of the database module: nothing here may rely
  // on state shared with render code.
  //
  // The admin-only restriction on /admin is enforced in that segment's
  // layout, plus requireAdmin() in every mutating server action regardless.
  // Approved while sitting on the waiting page: a reload lets them in.
  if (pathname === "/no-access" && canUseSite(req.auth?.role)) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (!isPublicRoute && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in is not enough: an admin has to have approved the person. The
  // role comes from the session cookie, which the jwt callback in
  // src/auth.ts re-reads from the database every minute, so approving,
  // demoting or removing someone takes effect without them signing in again.
  // This covers pages, server actions (they POST to a page) and the API
  // routes under the matcher alike.
  if (!isPublicRoute && !canUseSite(req.auth?.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not approved" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/no-access", req.nextUrl.origin));
  }
});

export const config = {
  // Run on (almost) every route, not just /admin. Server Components can't
  // set cookies, so the jwt callback's Microsoft token refresh only gets
  // persisted back to the browser when auth() runs as middleware — without
  // broad coverage here, a refreshed token is discarded after one render
  // and SharePoint-backed photos/links break again on the next request.
  //
  // api/snapshot, api/documents, api/asset-tags and api/assets are excluded because they
  // serve the iOS app, which holds a bearer token rather than a browser
  // session: the redirect above would answer its request with a 302 to the
  // login page, and an HTML body is exactly what the app reads as a failed
  // sync. They authenticate themselves — see src/lib/mobile/auth.ts.
  // api/cron is called by Vercel's scheduler and checks CRON_SECRET itself.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/snapshot|api/documents|api/asset-tags|api/assets|api/cron|sw.js|manifest.webmanifest|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
