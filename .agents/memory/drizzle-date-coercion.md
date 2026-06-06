---
name: Drizzle date column coercion
description: Orval coerces format:date fields to Date objects but Drizzle date() column expects string
---

## Rule

When using OpenAPI `format: date` fields in request bodies, the generated Zod schema uses `zod.coerce.date()`, producing a `Date` object. But Drizzle's `date()` column type expects a `string` (ISO date format `YYYY-MM-DD`).

**Fix:** In route handlers that INSERT or UPDATE calendar/date fields, explicitly convert:

```typescript
const dateStr = parsed.data.date instanceof Date
  ? parsed.data.date.toISOString().split("T")[0]
  : String(parsed.data.date);
```

**Why:** Drizzle's `date()` maps to PostgreSQL `DATE` and stores/returns as a string. Orval's `coerce.query` option in `orval.config.ts` applies coercion at the Zod validation layer, converting ISO date strings to `Date` objects. Type mismatch produces TS2769 at compile time.

**How to apply:** Any route handler that writes a `format: date` field from a validated body needs this conversion before passing to `.values()` or `.set()`.
