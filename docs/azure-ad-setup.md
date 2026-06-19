# Microsoft Entra ID setup (for IT / M365 admin)

This app uses "Sign in with Microsoft" for staff login, and the same sign-in
also grants the app permission to search and read files in SharePoint on
behalf of the signed-in user. Both depend on one app registration in your
Microsoft 365 tenant. Nothing else in the app requires Azure — hosting stays
on Vercel.

Until this is done, the app still works: equipment, specs, and the fault-finding
wizard all function normally, and manuals can be linked by pasting a SharePoint
share link by hand. The only thing gated on this setup is "Sign in with
Microsoft" and the "Search SharePoint" picker.

## Steps

1. In the [Microsoft Entra admin center](https://entra.microsoft.com), go to
   **Identity > Applications > App registrations > New registration**.
2. Name it something like "Compressor Cheat Sheet".
3. Under **Supported account types**, choose "Accounts in this organizational
   directory only" (single tenant).
4. Under **Redirect URI**, choose type "Web" and add:
   - `https://<your-production-domain>/api/auth/callback/microsoft-entra-id`
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (for local development)
5. After creation, note down from the **Overview** page:
   - **Application (client) ID**
   - **Directory (tenant) ID**
6. Go to **Certificates & secrets > New client secret**. Create one and copy
   the secret **value** immediately (it's not shown again).
7. Go to **API permissions > Add a permission > Microsoft Graph > Delegated
   permissions**, and add:
   - `User.Read` (usually present by default)
   - `Sites.Read.All`
   - `Files.Read.All`
8. Click **Grant admin consent for <organization>**. This step requires
   admin rights and is the one part only IT/an admin can do — until this is
   clicked, sign-in will fail with a consent error.

## Values to hand back to the developer

| Value | Goes into env var |
|---|---|
| Application (client) ID | `AUTH_MICROSOFT_ENTRA_ID_ID` |
| Client secret value | `AUTH_MICROSOFT_ENTRA_ID_SECRET` |
| `https://login.microsoftonline.com/<Directory (tenant) ID>/v2.0` | `AUTH_MICROSOFT_ENTRA_ID_ISSUER` |

Once these are set (see `.env.example`), redeploy — "Sign in with Microsoft"
and the SharePoint search picker turn on automatically. No code changes are
needed.
