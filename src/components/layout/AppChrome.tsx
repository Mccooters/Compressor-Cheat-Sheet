"use client";

import { usePathname } from "next/navigation";

// Asset-tag pages (/a/{id}) are what a customer sees after scanning a QR
// sticker on their equipment. They are deliberately a standalone page, not
// part of the Air Assist technician tool, so the app's nav bar, search and
// sign-in are hidden there. Matched case-insensitively because the stickers
// encode the path in uppercase (/A/...).
// The public asset pages, and the page shown to someone not yet approved
// (the nav's links would only bounce them back to it).
const STANDALONE = /^\/(a(\/|$)|no-access$)/i;

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE.test(pathname)) return null;
  return <>{children}</>;
}
