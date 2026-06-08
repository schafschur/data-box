---
name: CSS variable HSL wrapping
description: In this project, theme CSS variables store raw HSL components, not full color values — they must be used via Tailwind utilities or wrapped in hsl().
---

## Rule
`--background`, `--card`, `--foreground`, etc. are defined as raw HSL channel values (e.g. `26 55% 94%`), NOT as complete CSS colors. They cannot be used directly in `style={{ backgroundColor: "var(--background)" }}` — that resolves to an invalid CSS color and has no effect.

## How to apply
- **Use Tailwind utilities** — `bg-background`, `bg-card`, `text-foreground`, etc. These go through `--color-background: hsl(var(--background))` mappings defined at the top of `index.css`, which properly wrap the raw values.
- **If you must use inline style**, wrap manually: `style={{ backgroundColor: "hsl(var(--background))" }}`.
- Never use `var(--background)` (or any other raw theme token) bare in a CSS color property.

**Why:** Tailwind v4 separates the raw HSL channel vars from the resolved color vars (`--color-*`). The `bg-*` utilities reference the resolved `--color-*` vars, not the raw ones.
