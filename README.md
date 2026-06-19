# Compressor Cheat Sheet

Internal reference tool for compressors, controllers, and dryers, plus a
guided fault-finding wizard. Built with Next.js, Postgres (Drizzle ORM), and
Auth.js with optional Microsoft Entra ID / SharePoint integration.

## Getting started

See [docs/local-dev.md](docs/local-dev.md) for full setup instructions
(database, env vars, dev login, seed data).

```bash
npm install
npm run db:push
npm run db:seed   # optional sample data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connecting SharePoint

Manuals and datasheets stay in SharePoint — the app never copies them. By
default you add a manual by pasting its SharePoint link. To enable searching
SharePoint directly from within the app and "Sign in with Microsoft", your
IT/M365 admin needs to complete a one-time app registration — see
[docs/azure-ad-setup.md](docs/azure-ad-setup.md).

## Project structure

- `src/db/schema.ts` — database schema (equipment, document links, fault trees)
- `src/lib/equipment/` — equipment queries, Server Actions, per-type spec schemas
- `src/lib/faultTrees/` — fault tree queries, Server Actions, validation ("lint")
- `src/lib/graph/` — Microsoft Graph / SharePoint integration
- `src/app/equipment/`, `src/app/wizard/`, `src/app/search/` — public-facing pages
- `src/app/admin/` — equipment and fault tree editing UI (signed-in users only)
