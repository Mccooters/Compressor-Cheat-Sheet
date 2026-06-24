import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavLinks } from "@/components/layout/NavLinks";
import { AccountMenu } from "@/components/layout/AccountMenu";

const links = [
  { href: "/equipment", label: "Equipment" },
  { href: "/wizard", label: "Fault Finder" },
  { href: "/controllers", label: "Controllers" },
  { href: "/calculators", label: "Calculators" },
  { href: "/pressure-vessel-inspection", label: "Pressure Vessels" },
  { href: "/breathing-air-inspections", label: "Breathing Air" },
  { href: "/installations", label: "Installations" },
  { href: "/swms", label: "SWMS" },
  { href: "/search", label: "Search" },
];

const adminLink = [{ href: "/admin/equipment", label: "Admin" }];

export async function Nav() {
  const session = await auth();
  const role = session?.user ? await getCurrentUserRole() : null;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold text-slate-900 dark:text-white">
          Air Assist
        </Link>
        <NavLinks links={links} />
      </div>
      <div className="flex items-center gap-3 text-sm">
        {role === "admin" && <NavLinks links={adminLink} />}
        {session?.user ? (
          <AccountMenu
            email={session.user.email ?? session.user.name ?? "Account"}
            onSignOut={handleSignOut}
          />
        ) : (
          <>
            <ThemeToggle />
            <Link
              href="/login"
              className="text-amber-600 underline hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
