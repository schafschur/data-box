---
name: CSS @import order with Tailwind v4
description: Google Fonts @import url() cannot live inside the CSS file with Tailwind v4 — use index.html link tag
---

## Rule

Do NOT add `@import url('https://fonts.googleapis.com/...')` anywhere in the main CSS file when using Tailwind v4.

**Instead:** Add it as a `<link>` tag in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
```

**Why:** Tailwind v4 processes `@import "tailwindcss"` by generating a large block of CSS rules and inserting them inline. After processing, any `@import url()` that follows comes AFTER the generated rules in the output CSS, violating the CSS spec that `@import` must precede all other statements. PostCSS catches this and throws a warning/error. Placing the font import in HTML avoids this entirely.

**How to apply:** When the design subagent adds Google Fonts via `@import url()` in the CSS, move it to `index.html` as a `<link>` tag instead.
