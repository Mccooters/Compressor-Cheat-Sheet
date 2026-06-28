import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { NavMenu } from "@/components/layout/NavMenu";
import { NavLinks } from "@/components/layout/NavLinks";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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

const externalLinks = [
  { href: "https://flow.airassist.com.au", label: "Flow" },
  { href: "https://draw.airassist.com.au", label: "Draw" },
];

export async function Nav() {
  const session = await auth();
  const role = session?.user ? await getCurrentUserRole() : null;
  const menuLinks = role === "admin" ? [...links, ...adminLink] : links;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <nav className="relative flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
      <NavMenu links={menuLinks} />
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Air Assist"
          width={32}
          height={32}
          className="rounded-lg"
          priority
        />
        <span className="font-semibold text-slate-900 dark:text-white">Air Assist</span>
      </Link>
      <div className="ml-auto flex items-center gap-4 text-sm">
        <NavLinks links={externalLinks} />
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
