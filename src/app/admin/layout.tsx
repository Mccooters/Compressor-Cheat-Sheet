import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/auth/currentUser";

const adminLinks = [
  { href: "/admin/equipment", label: "Equipment" },
  { href: "/admin/fault-trees", label: "Fault trees" },
  { href: "/admin/controllers", label: "Controllers" },
  { href: "/admin/controllers/sharepoint-inspect", label: "SP Inspect" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin") redirect("/");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="flex gap-4 border-b border-slate-200 pb-3 text-sm dark:border-zinc-800">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-medium text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
