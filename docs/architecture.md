# Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) — read `node_modules/next/dist/docs/` before writing code |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via [Neon](https://neon.tech), ORM via Drizzle |
| Auth | Auth.js (next-auth v5) — Microsoft Entra ID (production) + dev-only email login |
| Hosting | Vercel (Pro plan — all deployments under same account) |
| External APIs | Microsoft Graph (SharePoint search, file reads) |

## Key environment variables

See `.env.example`. Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Session encryption key (`npx auth secret`) |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | App registration client ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | App registration client secret |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| `AUTH_DEV_LOGIN_ENABLED` | `true` to enable passwordless dev login (auto-off in production) |

---

## Directory structure

```
src/
  app/                        # Next.js App Router pages
    layout.tsx                # Root layout — Nav, fonts, theme script
    manifest.ts               # PWA manifest
    page.tsx                  # Home page
    admin/                    # Admin CRUD (equipment, controllers, fault trees, users)
    api/                      # API routes (auth, resource PDF proxy)
    calculators/              # All calculator pages (each in its own subfolder)
    controllers/              # Controller detail pages
    equipment/                # Equipment list + detail pages
    installations/            # Installation manuals index
    breathing-air-inspections/
    pressure-vessel-inspection/
    search/                   # Full search results page
    swms/                     # Safe Work Method Statements
    wizard/                   # Fault-finding wizard
    login/

  components/
    layout/                   # Nav, NavMenu, NavLinks, NavSearch, ThemeToggle, AccountMenu
    ui/                       # Shared primitives: Card, Button, Badge, Field, Stat, PageHeader, EmptyState
    calculators/              # NumberField, SelectField, DateField
    admin/                    # Admin tables and sort headers
    equipment/                # Equipment card, form, controllers panel
    controllers/              # Controller panels (fault codes, passwords, documents)
    documents/                # SharePoint document link panels
    faultTrees/               # Fault tree editor components
    pvi/                      # Pressure vessel inspection resource panels
    resources/                # Generic resource/document panels
    installations/
    search/

  lib/
    auth/                     # currentUser(), role checks
    calculators/              # Calculation logic + AS 1210 standard data
    controllers/              # DB queries for controllers
    documents/                # SharePoint link CRUD
    equipment/                # DB queries for equipment
    faultTrees/               # Fault tree DB queries + logic
    graph/                    # Microsoft Graph API client
    pvi/                      # PVI resource queries
    resources/                # Generic resource queries
    search/                   # Cross-entity search action

  db/
    schema.ts                 # Drizzle schema (single source of truth for DB shape)
    index.ts                  # DB client

  types/                      # Shared TypeScript types

public/
  logo.png                    # Brand logo (white bg, 2000×2000 source)
  icon-192.png                # PWA icon
  icon-512.png                # PWA icon
  apple-touch-icon.png        # iOS home screen icon
  sw.js                       # Service worker (offline / precache)

docs/
  architecture.md             # This file
  colour-scheme.md            # Full colour palette reference (copy to other projects)
  local-dev.md                # Local development setup
  azure-ad-setup.md           # Microsoft Entra ID / SharePoint setup for IT admins
  planned-features.md         # Upcoming work and decisions
  logo.png                    # Original logo source file
```

---

## Auth model

- Sign-in via Microsoft Entra ID (single-tenant, company staff only)
- Session stored as JWT in a cookie (Auth.js default)
- Two roles: `"user"` (default) and `"admin"`
- Role stored in the `users` table; fetched via `getCurrentUserRole()` in `src/lib/auth/currentUser.ts`
- Admin-gated routes: all of `/admin/**`
- Dev login at `/login` — enabled by `AUTH_DEV_LOGIN_ENABLED=true`, always off in production

---

## PWA

- Service worker at `public/sw.js` — precaches HTML and JS chunks for all calculator pages
- Manifest via `src/app/manifest.ts` (Next.js App Router convention)
- Installable, offline-capable for the calculators section
- See `src/app/calculators/layout.tsx` for the service worker registration

---

## SharePoint / document links

- Users can attach SharePoint document links to equipment, controllers, and PVI records
- Links are stored in the DB (title + URL), not the files themselves
- Admins can search SharePoint via Microsoft Graph to pick files without leaving the app
- The Graph client (`src/lib/graph/`) uses the signed-in user's delegated token — requires `Sites.Read.All` and `Files.Read.All` Graph permissions

---

## Calculators

All calculator pages are client components (`"use client"`) — they do all computation in the browser with no server round-trips.

Shared AS 1210 data lives in `src/lib/calculators/as1210.ts`. Do not add values to this file without user-supplied standard extracts to verify against. See `CLAUDE.md` for field status.

---

## Subdomain apps (planned)

Two companion tools exist as standalone HTML files and will be deployed as separate Vercel projects:

- `flow.airassist.com.au` — Compressed Air Network Planner (Hardy-Cross, Darcy-Weisbach)
- `draw.airassist.com.au` — Pneumatic Schematic Editor (ISO 1219 / AS 1101 symbols)

These are intentionally kept separate from this Next.js app — they use heavy global canvas state, `window.print()`, and `localStorage` that are incompatible with Next.js SSR and app-level chrome. See `docs/planned-features.md`.
