---
name: API server schema changes require restart
description: After adding DB columns via push-force, the API server esbuild bundle must be restarted to pick up the new schema.
---

## Rule
After any `pnpm --filter @workspace/db run push-force` that adds or removes columns, **restart the API server workflow** immediately.

**Why:** The API server uses esbuild to bundle its code at startup. The bundle snapshots the Drizzle schema at compile time. If the running server was compiled before a column was added, it silently ignores that column in both reads and writes — returning 200 with no error, but the column is never written to or included in responses.

**Symptom:** PUT returns 200, `updatedAt` changes, but the new column is NULL in the DB and absent from the response JSON.

**How to apply:** Any time a schema column is added or the Drizzle schema file (`lib/db/src/schema/*.ts`) changes, restart `artifacts/api-server: API Server` workflow before testing.
