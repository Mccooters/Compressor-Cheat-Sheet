export {};

declare module "next-auth" {
  interface Session {
    /** Who the person is to this site; "pending" until an admin approves them. */
    role?: import("@/lib/auth/access").UserRole;
    accessToken?: string;
    error?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: import("@/lib/auth/access").UserRole;
    /** When the role was last read from the database (ms since 1970). */
    accessCheckedAt?: number;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
