import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isDevLoginEnabled, isEntraConfigured } from "@/lib/graph/config";

const providers: Provider[] = [];

if (isEntraConfigured()) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: {
          // Delegated Graph scopes used by src/lib/graph/sharepoint.ts.
          scope:
            "openid profile email offline_access User.Read Sites.Read.All Files.Read.All",
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
});
