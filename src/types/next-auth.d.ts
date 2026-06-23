import type { DefaultSession } from "next-auth";

export {};

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      role?: "admin" | "viewer";
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
    role?: "admin" | "viewer";
  }
}
