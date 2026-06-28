import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { NavMenu } from "@/components/layout/NavMenu";

const links = [
  { href: "/equipment", label: "Equipment" },
  { href: "/controllers", label: "Controllers" },
  { href: "/pressure-vessel-inspection", label: "Pressure Vessels" },
  { href: "/installations", label: "Installations" },
  { href: "/breathing-air-inspections", label: "Breathing Air" },
  { href: "/calculators", label: "Calculators" },
  { href: "/wizard", label: "Fault Finder" },
  { href: "/swms", label: "SWMS" },
  { href: "https://flow.airassist.com.au", label: "Flow" },
  { href: "https://draw.airassist.com.au", label: "Draw" },
];

const adminLink = [{ href: "/admin/equipment", label: "Admin" }];

export async function Nav() {
  const session = await auth();
  const role = session?.user ? await getCurrentUserRole() : null;
  const allLinks = role === "admin" ? [...links, ...adminLink] : links;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <nav className="relative flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
      <NavMenu
        links={allLinks}
        email={session?.user ? session.user.email ?? session.user.name ?? "Account" : null}
        onSignOut={session?.user ? handleSignOut : undefined}
      />
      <Link href="/" className="font-semibold text-slate-900 dark:text-white">
        Air Assist
      </Link>
    </nav>
  );
}
