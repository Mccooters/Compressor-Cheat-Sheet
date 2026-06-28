# Planned features & pending work

Items in priority order. Update this file as things are completed or decisions change.

---

## 1. Temperature coefficient (y) dropdown — BLOCKED

**Where:** `src/app/calculators/mawp/page.tsx` and `src/app/calculators/minimum-wall-thickness/page.tsx`

**Status:** Still a free-text field. The S and E fields were converted to dropdowns in June 2026 using user-supplied table extracts from AS 1210—2010. The y field is next, but the user rejected the proposed 0.4 / 0.5 / 0.7 band values — they will supply the correct values from the standard.

**How to implement when data arrives:**
1. Add a `TEMP_COEFFICIENT_OPTIONS` array to `src/lib/calculators/as1210.ts` (same pattern as `JOINT_EFFICIENCY_OPTIONS`)
2. Replace `NumberField` for y with `<SelectField>` in both calculator pages
3. Follow same key/value/label pattern as E and S fields

**Constraint:** Do not fabricate or guess AS 1210 y values. Wait for user-supplied extract.

---

## 2. Flow subdomain — `flow.airassist.com.au`

**What:** Compressed Air Network Planner — canvas-based pipe network visualisation, Hardy-Cross loop solver, Darcy-Weisbach pressure drop, isometric/flat views, dark/blueprint themes, PDF report generation.

**Status:** Standalone HTML app (~3 000 lines) built and working. Needs a Vercel project + domain.

**Architecture decision (final):** Deploy as a separate Vercel static project, NOT integrated into this Next.js app. Reasons:
- Heavy global JS state (nodes, pipes, nextId, tool, panOffset, undoStack, etc.)
- `window.print()` needs to own the full page
- `localStorage` autosave
- Inline onclick handlers
- `document` / `window` access at module scope — incompatible with SSR

**Update workflow:** Single HTML file → paste to Claude in a new chat → get updated file → push to the subdomain repo → Vercel auto-deploys (~30 s).

**This repo's role:** Nav bar has a "Flow" orange badge link pointing to the subdomain. No iframe or embed — direct external link.

**To set up:**
1. Create a new GitHub repo (e.g. `air-assist-flow`)
2. Add the HTML file as `index.html`
3. Create a new Vercel project linked to that repo (same Pro account — no extra cost)
4. Add `flow.airassist.com.au` as a custom domain in Vercel

---

## 3. Draw subdomain — `draw.airassist.com.au`

**What:** Pneumatic Schematic Editor — canvas-based, ISO 1219 / AS 1101 symbols, drag-and-drop, BOM/parts list, revision history, PNG export, print to engineering frame (A3/A4).

**Status:** Same as Flow — standalone HTML app (~3 000 lines), built and working, needs a Vercel project + domain.

**Architecture decision:** Same reasoning as Flow. Separate Vercel static deployment. `window.print()` with `@page` / `@media print` rules that want to own the full printed page make embedding impossible.

**This repo's role:** "Draw" orange badge in the nav bar. Direct external link.

**To set up:** Same steps as Flow, different repo name (e.g. `air-assist-draw`).

---

## 4. Logo — transparent PNG version

**Current state:** `docs/logo.png` and `public/logo.png` have a white background. Works fine for light mode nav and all PWA icon slots. In dark mode the nav shows a white rounded square around the logo icon.

**Ideal state:** Export a transparent-background PNG from Canva, replace `docs/logo.png` and regenerate public icons with:
```bash
cp docs/logo.png public/logo.png
sips -z 512 512 public/logo.png --out public/icon-512.png
sips -z 192 192 public/logo.png --out public/icon-192.png
sips -z 180 180 public/logo.png --out public/apple-touch-icon.png
```

**Note:** If the logo has transparency, update `src/app/manifest.ts` `background_color` to match the intended splash screen colour (currently `"#ffffff"`).

---

## 5. Additional calculators (future)

No specific requirements defined yet. All new calculators must:
- Live under `src/app/calculators/<slug>/page.tsx`
- Be client components (`"use client"`)
- Use `NumberField` / `SelectField` / `DateField` from `src/components/calculators/`
- Source any standard-specific values from user-supplied extracts — never fabricated
- Include a disclaimer note about guidance-only use

---

## 6. Search improvements (future)

Full-text search currently covers equipment, controllers, fault trees, and SWMS. Not yet indexed: installation manuals, calculator pages, breathing air inspection content.
