import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stale leftover checkout one directory up (from the iCloud-sync move,
  // see project memory) also has a package-lock.json, which made Turbopack
  // misdetect the workspace root. Local-dev-only (Vercel's build container
  // never sees that stray directory), but pin it explicitly to avoid the
  // warning and any local tooling confusion.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
