"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

// Syncs its fields to the URL's query string as they change — text inputs
// debounced (so typing doesn't fire a navigation per keystroke), selects
// immediately. The page itself stays a Server Component reading
// searchParams as normal; this just drives those params without a full
// page reload (router.replace + scroll: false re-renders in place).
// Degrades to a plain GET form if JS hasn't loaded.
export function LiveFilterForm({
  children,
  debounceMs = 300,
  className,
}: {
  children: React.ReactNode;
  debounceMs?: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function syncToUrl() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim()) params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (e.target.tagName === "SELECT") {
      syncToUrl();
    } else {
      timeoutRef.current = setTimeout(syncToUrl, debounceMs);
    }
  }

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      onSubmit={(e) => {
        e.preventDefault();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        syncToUrl();
      }}
      className={className ?? "flex flex-wrap gap-3"}
    >
      {children}
    </form>
  );
}
