---
name: Adding new block types
description: Complete checklist for adding a new block type to Databox — six distinct files, with CreateBlockBody being the easily-missed one.
---

When adding a new block type (e.g. "contact"), update ALL of these:

1. `lib/db/src/schema/blocks.ts` — add to `BLOCK_TYPES` array
2. `lib/api-zod/src/generated/types/blockType.ts` — add to `BlockType` const object
3. **`lib/api-zod/src/generated/api.ts`** — add to `CreateBlockBody` `zod.enum([...])` at the `type` field (line ~225). **This is the hidden one** — missing it causes block creation to return `{"error":"Invalid request body"}` with no obvious clue why.
4. `lib/api-client-react/src/generated/api.schemas.ts` — add to both `BlockType` and `SearchResultBlockType` const objects
5. `artifacts/databox/src/components/blocks/BlockRenderer.tsx` — add icon to `ICONS` map and add render case in the JSX
6. `artifacts/databox/src/components/forms/CreateBlockDialog.tsx` — add to `z.enum([...])` and add a `<SelectItem>` entry

**Why:** The `CreateBlockBody` in `api-zod/generated/api.ts` has its own hardcoded enum (generated from openapi.yaml) and is NOT derived from `BLOCK_TYPES` or `blockType.ts`. It's the server-side validation for POST /api/instances/:id/blocks. Since Orval codegen doesn't run, all these files must be updated manually.

**How to apply:** Run `pnpm --filter @workspace/db run push` after updating the DB schema (only needed if a new sub-table is added — the blocks table type column is plain text, no constraint). Restart the API server after any `api-zod` change.
