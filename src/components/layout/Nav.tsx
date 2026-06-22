import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavLinks } from "@/components/layout/NavLinks";

const links = [
  { href: "/equipment", label: "Equipment" },
  { href: "/wizard", label: "Fault Finder" },
  { href: "/controllers", label: "Controllers" },
  { href: "/calculators", label: "Calculators" },
  { href: "/admin", label: "Admin" },
  { href: "/search", label: "Search" },
];

export async function Nav() {
  const session = await auth();

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold text-slate-900 dark:text-white">
          Compressor Cheat Sheet
        </Link>
        <NavLinks links={links} />
      </div>
      <div className="flex items-center gap-3 text-sm">
        <ThemeToggle />
        {session?.user ? (
          <>
            <span className="text-slate-500 dark:text-slate-400">
              {session.user.email ?? session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-amber-600 underline hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="text-amber-600 underline hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
