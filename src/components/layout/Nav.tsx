import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavLinks } from "@/components/layout/NavLinks";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { MobileNavMenu } from "@/components/layout/MobileNavMenu";
import { NavSearch } from "@/components/layout/NavSearch";

const links = [
  { href: "/equipment", label: "Equipment" },
  { href: "/controllers", label: "Controllers" },
  { href: "/pressure-vessel-inspection", label: "Pressure Vessels" },
  { href: "/installations", label: "Installations" },
  { href: "/breathing-air-inspections", label: "Breathing Air" },
  { href: "/calculators", label: "Calculators" },
  { href: "/wizard", label: "Fault Finder" },
  { href: "/swms", label: "SWMS" },
];

const adminLink = [{ href: "/admin/equipment", label: "Admin" }];

export async function Nav() {
  const session = await auth();
  const role = session?.user ? await getCurrentUserRole() : null;
  const mobileLinks = role === "admin" ? [...links, ...adminLink] : links;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <nav className="relative flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold text-slate-900 dark:text-white">
          Air Assist
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          <NavLinks links={links} />
        </div>
      </div>
      <div className="hidden items-center gap-4 text-sm md:flex">
        <div className="w-48 lg:w-64">
          <NavSearch />
        </div>
        {role === "admin" && <NavLinks links={adminLink} />}
        <a
          href="https://flow.airassist.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          Flow
        </a>
        <a
          href="https://draw.airassist.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          Draw
        </a>
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
      <MobileNavMenu
        links={mobileLinks}
        email={session?.user ? session.user.email ?? session.user.name ?? "Account" : null}
        onSignOut={session?.user ? handleSignOut : undefined}
      />
    </nav>
  );
}
