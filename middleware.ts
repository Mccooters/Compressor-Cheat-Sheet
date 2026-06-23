import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoginRoute = req.nextUrl.pathname === "/login";

  // Only a lightweight JWT check here — no DB access. Middleware/proxy runs
  // in a separate, minimal execution context that isn't meant to depend on
  // shared modules like a DB connection pool; the admin-only restriction on
  // /admin is enforced in that segment's layout instead, plus requireAdmin()
  // in every mutating server action regardless.
  if (!isLoginRoute && !req.auth) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
