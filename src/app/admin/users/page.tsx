import { auth } from "@/auth";
import { listAppUsers } from "@/lib/auth/roles";
import { setUserRole } from "@/lib/auth/actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([auth(), listAppUsers()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone who has signed in. New sign-ins default to Viewer (read-only); promote someone to Admin to let them edit and reach the rest of /admin."
      />
      <div className="space-y-3">
        {users.map((user) => {
          const isSelf = user.email === session?.user?.email;
          return (
            <Card key={user.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {user.name ?? user.email}
                  {isSelf && (
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={user.role === "admin" ? "amber" : "neutral"}>
                  {user.role}
                </Badge>
                {!isSelf && (
                  <form
                    action={async () => {
                      "use server";
                      await setUserRole(
                        user.id,
                        user.role === "admin" ? "viewer" : "admin"
                      );
                    }}
                  >
                    <Button type="submit" variant="secondary">
                      {user.role === "admin" ? "Make viewer" : "Make admin"}
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
