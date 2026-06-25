"use client";

import { useEffect } from "react";

// Only registered from the calculators layout — these are the only pages
// meant to work offline, so there's no reason to load this anywhere else.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
  }, []);
  return null;
}
