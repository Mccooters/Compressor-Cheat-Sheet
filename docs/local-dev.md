# Local development

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (a free
   [Neon](https://neon.tech) Postgres project works well — use the pooled
   connection string).
2. Generate an `AUTH_SECRET`:
   ```
   npx auth secret
   ```
3. Install dependencies and push the schema to your database:
   ```
   npm install
   npm run db:push
   ```
4. (Optional) Load sample equipment and a sample fault tree:
   ```
   npm run db:seed
   ```
5. Start the app:
   ```
   npm run dev
   ```

## Signing in without Microsoft Entra ID

`AUTH_DEV_LOGIN_ENABLED=true` (set in `.env.example` by default) turns on a
dev-only login at `/login` that accepts any name/email with no password and
no real Microsoft account. This is so the app is fully usable — including
everything under `/admin` — before your Microsoft Entra ID app registration
exists (see `docs/azure-ad-setup.md`).

This login method is automatically disabled whenever `NODE_ENV=production`,
regardless of the env var, so it can never accidentally ship to production.

## What works without Microsoft Entra ID configured

Everything except "Sign in with Microsoft" itself and the "Search SharePoint"
picker when adding a manual. Equipment browsing/search, the admin CRUD
screens, fault tree editing, and the fault-finding wizard all work using the
dev login above. Manuals can still be linked by pasting a SharePoint URL
directly.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run db:generate` | Generate a new SQL migration from schema changes in `src/db/schema.ts` |
| `npm run db:push` | Push the current schema straight to the database (fastest for local dev) |
| `npm run db:migrate` | Apply generated migrations (use this in CI/production instead of `db:push`) |
| `npm run db:studio` | Open Drizzle Studio to browse/edit data in a GUI |
| `npm run db:seed` | Insert sample equipment and a sample fault tree |
| `npm run db:seed-fault-trees` | Insert a full set of fault-finding trees for rotary screw electric air compressors (links to any matching equipment already in the database) |
