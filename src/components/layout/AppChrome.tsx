"use client";

import { usePathname } from "next/navigation";

// Asset-tag pages (/a/{id}) are what a customer sees after scanning a QR
// sticker on their equipment. They are deliberately a standalone page, not
// part of the Air Assist technician tool, so the app's nav bar, search and
// sign-in are hidden there. Matched case-insensitively because the stickers
// encode the path in uppercase (/A/...).
const STANDALONE = /^\/a(\/|$)/i;

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE.test(pathname)) return null;
  return <>{children}</>;
}
