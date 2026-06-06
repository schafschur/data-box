---
name: Object storage React overrides
description: Uppy v5 pnpm overrides require explicit React version, not $react shorthand
---

## Rule

When adding Uppy v5 to a workspace that uses catalog-versioned React, add pnpm overrides to the root `package.json` like this:

```json
"pnpm": {
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

**Why:** Uppy v5 declares `react@>=19` as a peer dependency. The `$react` shorthand (e.g. `"react": "$react"`) only works when `react` is a **direct** dependency of the root `package.json`. Since the monorepo uses `catalog:` for React versions with devDependencies living in artifact packages (not the root), `$react` fails with "Cannot resolve version $react in overrides". The explicit version string (`19.1.0`) is the correct fix.

**How to apply:** When following the object-storage skill's Step 5, substitute the exact catalog React version for `$react`/`$react-dom`. Check `pnpm-workspace.yaml` catalog section for the current version.
