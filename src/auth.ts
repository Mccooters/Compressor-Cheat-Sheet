import { cache } from "react";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isDevLoginEnabled, isEntraConfigured } from "@/lib/graph/config";
import { resolveUserRole } from "@/lib/auth/roles";

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
          const refreshed = await response.json();
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

      // Resolved on every call (not just sign-in) so a role change made from
      // /admin/users takes effect on the user's next request rather than
      // requiring them to sign out and back in.
      if (typeof token.email === "string") {
        token.role = await resolveUserRole(
          token.email,
          typeof token.name === "string" ? token.name : null
        );
      }

      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      if (token.error) {
        session.error = token.error;
      }
      if (token.role) {
        session.user.role = token.role;
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
