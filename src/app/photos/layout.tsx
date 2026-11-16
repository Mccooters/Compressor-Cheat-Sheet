import type { Metadata } from "next";
import { hasRole } from "@/lib/auth/access";
import { getCurrentUserRole } from "@/lib/auth/currentUser";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Photos · Air Assist" };

// Job photos show customers' sites and equipment, so they are for Staff and
// Admins, not every approved viewer. The same check is made again in
// /api/photos, which hands out the files themselves.
export default async function PhotosLayout({ children }: { children: React.ReactNode }) {
  const role = await getCurrentUserRole();
  if (!hasRole(role, "staff")) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Photos" />
        <Card>
          <p className="text-slate-700 dark:text-slate-300">
            Job photos are for Staff and Admins. Ask an Air Assist admin to
            change your role on the Users page.
          </p>
        </Card>
      </div>
    );
  }
  return <div className="mx-auto max-w-6xl space-y-6">{children}</div>;
}
