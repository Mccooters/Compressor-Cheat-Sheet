"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavLinks } from "@/components/layout/NavLinks";
import { NavSearch } from "@/components/layout/NavSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function MobileNavMenu({
  links,
  email,
  onSignOut,
}: {
  links: { href: string; label: string }[];
  email: string | null;
  onSignOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Closing on route change (rather than relying on click-outside alone)
  // means tapping a link in the panel always dismisses it. Adjusting state
  // during render (not in an effect) avoids an extra commit per navigation.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-20 flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <NavSearch />
          <div className="flex flex-col gap-4">
            <NavLinks links={links} />
          </div>
          <hr className="border-slate-200 dark:border-zinc-800" />
          {email ? (
            <>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{email}</p>
              {onSignOut && (
                <form action={onSignOut}>
                  <button
                    type="submit"
                    className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                  >
                    Sign out
                  </button>
                </form>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm text-orange-600 underline hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
      )}
    </div>
  );
}
