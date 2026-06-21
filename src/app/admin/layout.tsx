import Link from "next/link";

const adminLinks = [
  { href: "/admin/equipment", label: "Equipment" },
  { href: "/admin/fault-trees", label: "Fault trees" },
  { href: "/admin/controllers", label: "Controllers" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="flex gap-4 border-b border-neutral-200 pb-3 text-sm dark:border-neutral-800">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
