export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto max-w-4xl">{children}</div>;
}
