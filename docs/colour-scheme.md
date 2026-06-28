# Colour Scheme — Air Assist Design System

Dark/orange aesthetic. Zinc surfaces (no blue tint), orange accents. Built with Tailwind CSS v4.

---

## Palette

### Surfaces (dark mode)
| Role | Class |
|---|---|
| Page / deepest background | `dark:bg-zinc-950` |
| Card / panel background | `dark:bg-zinc-900/80` |
| Elevated surface (dropdowns, tooltips) | `dark:bg-zinc-900` |
| Input / form field background | `dark:bg-zinc-950` |
| Badge / tag background (neutral) | `dark:bg-zinc-800` |

### Borders (dark mode)
| Role | Class |
|---|---|
| Nav / section dividers | `dark:border-zinc-800` |
| Card / input borders | `dark:border-zinc-700` |
| Hover border accent | `dark:hover:border-orange-500/50` |

### Surfaces (light mode)
| Role | Class |
|---|---|
| Page background | `bg-white` |
| Card background | `bg-white` |
| Input background | `bg-white` |
| Stat / muted surface | `bg-slate-50` |

### Borders (light mode)
| Role | Class |
|---|---|
| Card / input borders | `border-slate-200` or `border-slate-300` |
| Nav divider | `border-slate-200` |

---

## Accent — Orange

All interactive chrome uses orange. Do **not** use amber — it reads as golden-yellow and clashes with the logo.

| Role | Light mode | Dark mode |
|---|---|---|
| Active nav link | `text-orange-600` | `dark:text-orange-400` |
| Link / CTA text | `text-orange-600` | `dark:text-orange-400` |
| Link hover | `hover:text-orange-700` | `dark:hover:text-orange-300` |
| Primary button fill | `bg-orange-500` | `dark:bg-orange-400` |
| Primary button hover | `hover:bg-orange-600` | `dark:hover:bg-orange-300` |
| Primary button text | `text-zinc-950` | — |
| Focus ring | `focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30` | same |
| Card hover border | `hover:border-orange-400` | `dark:hover:border-orange-500/50` |
| Eyebrow / label text | `text-orange-600` | `dark:text-orange-400` |
| Page header eyebrow | `text-orange-600` | `dark:text-orange-400` |

---

## Text

Slate text classes are fine — they render as near-black/grey and the slight blue tint is imperceptible at text scale.

| Role | Class |
|---|---|
| Primary heading | `text-slate-900 dark:text-white` |
| Body / paragraph | `text-slate-600 dark:text-slate-400` |
| Muted / helper | `text-slate-500 dark:text-slate-500` |
| Placeholder | `placeholder:text-slate-400 dark:placeholder:text-slate-600` |
| Label / uppercase tag | `text-slate-500 dark:text-slate-400` |

---

## Nav bar

```
bg-white dark:bg-zinc-950
border-b border-slate-200 dark:border-zinc-800
px-4 py-3 sm:px-6
```

Hamburger button: `text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800`

Hamburger panel (full-width dropdown):
```
absolute inset-x-0 top-full z-20
bg-white dark:bg-zinc-950
border-b border-slate-200 dark:border-zinc-800
shadow-lg px-6 py-4
```

---

## Cards

```html
<!-- Standard card -->
<div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm
            dark:border-zinc-700 dark:bg-zinc-900/80 sm:p-6">

<!-- Clickable / link card -->
<a class="rounded-xl border border-slate-200 bg-white shadow-sm transition
          hover:border-orange-400 hover:shadow-md
          dark:border-zinc-700 dark:bg-zinc-900/80
          dark:hover:border-orange-500/50">
```

---

## Inputs & form fields

```
rounded-lg border border-slate-300 bg-white px-3 py-2 text-base
text-slate-900 placeholder:text-slate-400
focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30
dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder:text-slate-600
```

---

## Buttons

**Primary:**
```
bg-orange-500 text-zinc-950 hover:bg-orange-600
dark:bg-orange-400 dark:hover:bg-orange-300
rounded-md px-4 py-2 text-sm font-medium transition
```

**Secondary:**
```
border border-slate-300 text-slate-700 hover:border-orange-400
dark:border-zinc-700 dark:text-slate-300 dark:hover:border-orange-500/60
rounded-md px-4 py-2 text-sm font-medium transition
```

**Danger:**
```
text-red-600 hover:underline dark:text-red-400 text-sm font-medium
```

---

## PWA / manifest

```json
{
  "background_color": "#ffffff",
  "theme_color": "#ea6c0a"
}
```

`#ea6c0a` is the orange from the calculator logo swoosh.

---

## globals.css (Tailwind v4)

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

Dark theme toggle is driven by a `dark` class on `<html>`, set by an inline script in `<head>` (reads `localStorage.getItem('theme')`).
