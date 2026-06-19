import { signIn } from "@/auth";
import { isDevLoginEnabled, isEntraConfigured } from "@/lib/graph/config";

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
      <h1 className="text-xl font-semibold">Sign in</h1>

      {entraEnabled && (
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign in with Microsoft
          </button>
        </form>
      )}

      {devLoginEnabled && (
        <form
          action={async (formData: FormData) => {
            "use server";
            const name = formData.get("name")?.toString() ?? "";
            const email = formData.get("email")?.toString() ?? "";
            await signIn("dev-login", { name, email, redirectTo });
          }}
          className="space-y-3 rounded-md border border-dashed border-neutral-400 p-4"
        >
          <p className="text-sm text-neutral-500">
            Dev login (no SSO) — disabled in production.
          </p>
          <input
            name="name"
            placeholder="Your name"
            className="w-full rounded-md border px-3 py-2"
          />
          <input
            name="email"
            placeholder="you@example.com"
            required
            className="w-full rounded-md border px-3 py-2"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-800 px-4 py-2 text-white hover:bg-neutral-900"
          >
            Continue
          </button>
        </form>
      )}

      {!entraEnabled && !devLoginEnabled && (
        <p className="text-sm text-red-600">
          No login method is configured. Set AUTH_MICROSOFT_ENTRA_ID_* env
          vars, or set AUTH_DEV_LOGIN_ENABLED=true for local development.
        </p>
      )}
    </div>
  );
}
