import { signIn } from "@/auth";
import { isDevLoginEnabled, isEntraConfigured } from "@/lib/graph/config";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/Field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/";
  const entraEnabled = isEntraConfigured();
  const devLoginEnabled = isDevLoginEnabled();

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6 px-4">
      <PageHeader title="Sign in" />

      {entraEnabled && (
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Microsoft
          </Button>
        </form>
      )}

      {devLoginEnabled && (
        <Card>
          <form
            action={async (formData: FormData) => {
              "use server";
              const name = formData.get("name")?.toString() ?? "";
              const email = formData.get("email")?.toString() ?? "";
              await signIn("dev-login", { name, email, redirectTo });
            }}
            className="space-y-3"
          >
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Dev login (no SSO) — disabled in production.
            </p>
            <input name="name" placeholder="Your name" className={fieldInputClass} />
            <input
              name="email"
              placeholder="you@example.com"
              required
              className={fieldInputClass}
            />
            <Button type="submit" variant="secondary" className="w-full">
              Continue
            </Button>
          </form>
        </Card>
      )}

      {!entraEnabled && !devLoginEnabled && (
        <p className="text-sm text-red-600 dark:text-red-400">
          No login method is configured. Set AUTH_MICROSOFT_ENTRA_ID_* env
          vars, or set AUTH_DEV_LOGIN_ENABLED=true for local development.
        </p>
      )}
    </div>
  );
}
