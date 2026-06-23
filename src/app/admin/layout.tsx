import Link from "next/link";

const adminLinks = [
  { href: "/admin/equipment", label: "Equipment" },
  { href: "/admin/fault-trees", label: "Fault trees" },
  { href: "/admin/controllers", label: "Controllers" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="flex gap-4 border-b border-slate-200 pb-3 text-sm dark:border-slate-800">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-medium text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
