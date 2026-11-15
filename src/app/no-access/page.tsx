import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Waiting for approval · Air Assist",
  robots: { index: false, follow: false },
};

// Where the request gate (src/proxy.ts) sends someone who has signed in with
// Microsoft but hasn't been approved by an admin yet.
export default async function NoAccessPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  // Once they're approved, the request gate sends a reload of this page on
  // to the home page (it has the freshly checked role; this render may not).

  return (
    <div className="mx-auto mt-16 max-w-md space-y-6 px-4">
      <PageHeader title="Waiting for approval" />
      <Card className="space-y-3">
        <p className="text-slate-700 dark:text-slate-300">
          You&apos;re signed in as{" "}
          <span className="font-medium">{session.user.email}</span>, but an
          admin needs to approve your access before you can use Air Assist.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ask an Air Assist admin to approve you on the Users page, then
          reload this page.
        </p>
      </Card>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="secondary" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
