import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Air Assist Calculators",
    short_name: "AA Calculators",
    description: "Offline field calculators for compressed air and pressure equipment work.",
    start_url: "/calculators",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ea6c0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
