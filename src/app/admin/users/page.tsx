import { auth } from "@/auth";
import { listAppUsers } from "@/lib/auth/roles";
import { removeUser, setUserRole } from "@/lib/auth/actions";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  isUserRole,
  type UserRole,
} from "@/lib/auth/access";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/Field";

type AppUser = Awaited<ReturnType<typeof listAppUsers>>[number];

const ROLE_TONE: Record<UserRole, "neutral" | "amber" | "green"> = {
  pending: "neutral",
  viewer: "neutral",
  staff: "green",
  admin: "amber",
};

function RemoveButton({ user }: { user: AppUser }) {
  return (
    <form
      action={async () => {
        "use server";
        await removeUser(user.id);
      }}
    >
      <Button type="submit" variant="danger">
        Remove
      </Button>
    </form>
  );
}

function Person({ user, isSelf }: { user: AppUser; isSelf: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-slate-900 dark:text-white">
        {user.name ?? user.email}
        {isSelf && (
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
            (you)
          </span>
        )}
      </p>
      <p className="truncate text-sm text-slate-500 dark:text-slate-400">
        {user.email}
      </p>
    </div>
  );
}

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([auth(), listAppUsers()]);
  const waiting = users.filter((user) => user.role === "pending");
  const approved = users.filter((user) => user.role !== "pending");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="Signing in with Microsoft isn't enough: each person waits here until an admin approves them. Viewers read; Staff is for office features as they're added; Admins edit and reach the rest of /admin. Removing someone signs them out within a minute."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Waiting for approval
        </h2>
        {waiting.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nobody is waiting.
          </p>
        )}
        {waiting.map((user) => (
          <Card
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <Person user={user} isSelf={false} />
            <div className="flex flex-wrap items-center gap-2">
              {(["viewer", "staff"] as const).map((role) => (
                <form
                  key={role}
                  action={async () => {
                    "use server";
                    await setUserRole(user.id, role);
                  }}
                >
                  <Button
                    type="submit"
                    variant={role === "viewer" ? "primary" : "secondary"}
                  >
                    Approve as {ROLE_LABELS[role]}
                  </Button>
                </form>
              ))}
              <RemoveButton user={user} />
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Approved
        </h2>
        {approved.map((user) => {
          const isSelf = user.email === session?.user?.email;
          return (
            <Card
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Person user={user} isSelf={isSelf} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={ROLE_TONE[user.role]}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                {!isSelf && (
                  <>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const role = formData.get("role");
                        if (isUserRole(role)) await setUserRole(user.id, role);
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="role"
                        defaultValue={user.role}
                        aria-label={`Role for ${user.name ?? user.email}`}
                        className={fieldInputClass.replace("w-full", "w-auto").replace("mt-1.5 ", "")}
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="secondary">
                        Change
                      </Button>
                    </form>
                    <RemoveButton user={user} />
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
