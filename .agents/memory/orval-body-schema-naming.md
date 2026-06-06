---
name: Orval body schema naming
description: API spec body schemas must use entity-shaped names to avoid TS2308 collisions after codegen
---

## Rule

Every request body in `lib/api-spec/openapi.yaml` must be a `$ref` to a `components/schemas` entry named after the **entity**, not the operation.

Good: `CategoryInput`, `BlockUpdate`, `InstanceInput`
Bad: `CreateCategoryBody`, `UpdateBlockBody` (collide with Orval's auto-derived Zod names)

**Why:** For each operation with a body, Orval emits a Zod schema named `<OperationIdPascal>Body` (e.g. `createCategory` → `CreateCategoryBody`) into `generated/api.ts`. It also emits TypeScript interfaces for reachable body schemas into `generated/types/`. The barrel `lib/api-zod/src/index.ts` re-exports both with `export *`. When names collide you get TS2308 — but only during the `typecheck:libs` step that runs after orval, not during orval itself, so the failure looks like a codegen error.

**How to apply:** Check the `openapi.md` reference in `pnpm-workspace` skill whenever writing a new spec or modifying body schemas. The rule: name the component after the entity, never after the operation.
