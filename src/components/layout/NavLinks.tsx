"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const isExternal = link.href.startsWith("http");
        const isActive =
          !isExternal &&
          (link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(`/${link.href.split("/").filter(Boolean)[0]}`));
        const className = `text-sm font-medium transition ${
          isActive
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        }`;

        if (isExternal) {
          return (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
              {link.label}
            </a>
          );
        }

        return (
          <Link key={link.href} href={link.href} className={className}>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
