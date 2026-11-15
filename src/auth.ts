import { cache } from "react";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isDevLoginEnabled, isEntraConfigured } from "@/lib/graph/config";
import {
  isDefinitiveRefreshFailure,
  recheckAfterMs,
} from "@/lib/auth/access";
import { findUserRole, resolveUserRole } from "@/lib/auth/roles";

const providers: Provider[] = [];

// Shared with the refresh_token request in the jwt callback below — both
// need to ask for the same scopes.
const ENTRA_SCOPE =
  "openid profile email offline_access User.Read Sites.Read.All Files.Read.All";

if (isEntraConfigured()) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: {
          // Delegated Graph scopes used by src/lib/graph/sharepoint.ts.
          scope: ENTRA_SCOPE,
        },
      },
    })
  );
}

if (isDevLoginEnabled()) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login (no SSO)",
      credentials: {
        name: { label: "Name", type: "text" },
        email: { label: "Email", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        if (!email) return null;
        return {
          id: email,
          name: credentials?.name?.toString() || email,
          email,
        };
      },
    })
  );
}

const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // Initial sign-in. account.expires_at is unix seconds; only the
        // Entra ID provider sets refresh_token/expires_at (dev-login has
        // neither, which is fine — it never needs refreshing).
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        delete token.error;
      } else if (
        token.expiresAt &&
        Date.now() >= token.expiresAt * 1000 - 60_000 &&
        token.refreshToken
      ) {
        // Access token is expired (or about to be) and we have a refresh
        // token — exchange it rather than letting Graph calls fail with
        // "Lifetime validation failed" partway through a session.
        try {
          const tokenEndpoint = `${(process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "").replace(/\/v2\.0\/?$/, "")}/oauth2/v2.0/token`;
          const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
              client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
              grant_type: "refresh_token",
              refresh_token: token.refreshToken,
              scope: ENTRA_SCOPE,
            }),
          });
          const refreshed = await response.json().catch(() => null);
          // The Microsoft account has been disabled or deleted, its password
          // changed or its sign-ins revoked. Returning null signs this
          // browser out, so someone who has left stops getting in as soon
          // as their Microsoft token runs out (within the hour), not when
          // the 30-day session cookie finally expires.
          if (isDefinitiveRefreshFailure(response.status, refreshed)) {
            console.warn("Microsoft refused to refresh a session; signing it out.");
            return null;
          }
          if (!response.ok) throw refreshed;

          token.accessToken = refreshed.access_token;
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
          // Microsoft rotates refresh tokens — keep the new one if issued.
          token.refreshToken = refreshed.refresh_token ?? token.refreshToken;
          delete token.error;
        } catch (err) {
          console.error("Failed to refresh Microsoft access token:", err);
          token.error = "RefreshAccessTokenError";
        }
      }

      // Who may use the site. The role is read from the database at sign-in
      // and again every minute, and carried in the session cookie in
      // between, so the request gate (src/proxy.ts) can check it without a
      // database round trip on every request.
      const email = token.email;
      const now = Date.now();
      if (
        email &&
        (account ||
          !token.accessCheckedAt ||
          now - token.accessCheckedAt >= recheckAfterMs(token.role))
      ) {
        try {
          if (account) {
            // Signing in: a first-time person is recorded as "pending".
            token.role = await resolveUserRole(email, token.name);
          } else {
            const role = await findUserRole(email);
            // Removed by an admin since the last check: signed out. Signing
            // in again makes them "pending", waiting for approval afresh.
            if (!role) return null;
            token.role = role;
          }
          token.accessCheckedAt = now;
        } catch (err) {
          // The database didn't answer. Someone already let in stays in on
          // the role last seen; someone not yet checked stays out.
          console.error("Couldn't check a user's role:", err);
          token.role ??= "pending";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.role = token.role ?? "pending";
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (token.error) {
        session.error = token.error;
      }
      return session;
    },
  },
});

// Dedupes concurrent auth() calls within a single request render — without
// this, rendering N items in parallel (e.g. resolving N SharePoint photo
// URLs) re-runs the jwt callback N times, which can fire N simultaneous
// token-refresh requests once the access token is near expiry. Entra
// rotates refresh tokens on use, so only one of those would actually
// succeed.
const auth = cache(uncachedAuth);

export { handlers, auth, signIn, signOut };
