import { listMobileTokens } from "@/lib/mobile/tokens";
import { revokePhoneToken } from "@/lib/mobile/tokenActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NewTokenForm } from "./NewTokenForm";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

export default async function AdminPhonesPage() {
  const tokens = await listMobileTokens();
  const sharedTokenSet = Boolean(process.env.MOBILE_API_TOKEN);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Phones"
        description="Each phone gets its own access token for the Air Assist app. Revoke one when a phone is lost or someone leaves; the other phones carry on."
      />

      <Card>
        <NewTokenForm />
      </Card>

      {sharedTokenSet && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-slate-400">
          The older shared token is still accepted, so phones that haven&apos;t
          been given their own keep working. Once every phone has its own
          token, remove MOBILE_API_TOKEN from the site&apos;s settings to
          switch the shared one off.
        </p>
      )}

      <section className="space-y-3">
        {tokens.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No phone has its own token yet.
          </p>
        )}
        {tokens.map((token) => (
          <Card
            key={token.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-white">
                {token.label}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Made {DATE.format(token.createdAt)}
                {token.createdBy ? ` by ${token.createdBy}` : ""}
                {" · "}
                {token.lastUsedAt
                  ? `last used ${DATE.format(token.lastUsedAt)}`
                  : "never used"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {token.revokedAt ? (
                <Badge>Revoked {DATE.format(token.revokedAt)}</Badge>
              ) : (
                <>
                  <Badge tone="green">Active</Badge>
                  <form
                    action={async () => {
                      "use server";
                      await revokePhoneToken(token.id);
                    }}
                  >
                    <Button type="submit" variant="danger">
                      Revoke
                    </Button>
                  </form>
                </>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
