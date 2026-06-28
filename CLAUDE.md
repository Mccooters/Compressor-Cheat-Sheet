@AGENTS.md

# Project: Air Assist

Compressed air reference tool for Australian field technicians. Equipment specs, fault-finding wizard, pressure vessel calculators, and inspection cheat sheets — all clause-accurate to Australian standards (AS 1210, AS 4343, AS/NZS 3788, etc.).

See `docs/architecture.md` for a full structural overview.

---

# Design system

- Zinc surfaces (dark mode), orange accents, white backgrounds (light mode)
- Full reference: `docs/colour-scheme.md`
- Do **not** use `amber-` — use `orange-` for all accents
- Do **not** use `dark:bg-slate-` / `dark:border-slate-` — use `zinc-` variants

---

# Navigation architecture

`src/components/layout/Nav.tsx` — server component, renders the top bar.

Layout: `[☰ NavMenu] [Logo + Air Assist] ··· [Flow badge] [Draw badge] [Admin?] [ThemeToggle / AccountMenu]`

- **NavMenu** (`src/components/layout/NavMenu.tsx`) — universal hamburger (all screen sizes). Contains `NavSearch` + `NavLinks` for the 8 main page links only. No account controls inside.
- **Flow / Draw** — rendered as orange pill badges (`appBadgeClass`) in Nav.tsx, open in a new tab. These link to separate Vercel deployments (see `docs/planned-features.md`).
- **Admin link** — shown only when `role === "admin"` via `NavLinks`.
- **ThemeToggle / AccountMenu** — always visible in the header bar.
- `MobileNavMenu.tsx` is a now-unused legacy file — leave in place, do not wire it up.

---

# Calculators

All calculators live under `src/app/calculators/`. Rule: **never fabricate AS standard values** — all numeric data must come from user-supplied standard extracts.

## AS 1210 shared data — `src/lib/calculators/as1210.ts`
- `JOINT_EFFICIENCY_OPTIONS` — 15 combinations from Table 3.5.1.7 (user-verified)
- `ALLOWABLE_STRESS_OPTIONS` — carbon/C-Mn plate grades at 50°C from Table B1(B) (user-verified)

## Dropdown field component — `src/components/calculators/SelectField.tsx`

## Field status

| Field | Calculator pages | Status |
|---|---|---|
| Joint efficiency (E) | MAWP, min wall thickness | Done — dropdown from Table 3.5.1.7 |
| Allowable stress (S) | MAWP, min wall thickness | Done — dropdown from Table B1(B), 50°C, t ≤ 16 mm |
| Temperature coefficient (y) | MAWP, min wall thickness | **Pending** — still free-text. Awaiting user-supplied values from AS 1210. Do not guess. |

---

# Branding / logo

- Source file: `docs/logo.png` (2000×2000 px, white background)
- Deployed copies: `public/logo.png`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- Nav usage: `<Image src="/logo.png" width={32} height={32} className="rounded-lg" priority />`
- PWA manifest: `background_color: "#ffffff"`, `theme_color: "#ea6c0a"` (orange from logo swoosh)
- To replace the logo: drop a new PNG into `docs/logo.png`, copy to `public/logo.png`, regenerate icon sizes with `sips`.

---

# Pending / planned work

See `docs/planned-features.md` for the full list with context.

Key items:
1. **Temperature coefficient (y) dropdown** — blocked on user supplying AS 1210 values
2. **Flow subdomain** (`flow.airassist.com.au`) — separate Vercel project, standalone HTML app
3. **Draw subdomain** (`draw.airassist.com.au`) — separate Vercel project, standalone HTML app
