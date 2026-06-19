import Link from "next/link";
import { auth, signOut } from "@/auth";

const links = [
  { href: "/equipment", label: "Equipment" },
  { href: "/wizard", label: "Fault Finder" },
  { href: "/search", label: "Search" },
  { href: "/admin/equipment", label: "Admin" },
];

export async function Nav() {
  const session = await auth();

  return (
    <nav className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">
          Compressor Cheat Sheet
        </Link>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {session?.user ? (
          <>
            <span className="text-neutral-500">
              {session.user.email ?? session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="underline">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="underline">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
