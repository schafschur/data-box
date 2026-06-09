---
name: API server cannot import zod directly
description: esbuild bundling in api-server cannot resolve bare "zod" package; workaround patterns.
---

The api-server uses esbuild to bundle. `zod` is NOT listed as a direct dependency of `@workspace/api-server`, so `import { z } from "zod"` fails at build time with "Could not resolve 'zod'".

**Rule:** Never add `import { z } from "zod"` in api-server route files.

**Why:** esbuild bundles the api-server and only knows about packages listed in api-server's own package.json. zod is a peer of @workspace/api-zod, not api-server.

**How to apply:**
- For request validation in routes, either use inline TypeScript type narrowing (`typeof x.id !== "number"`) or import pre-built Zod schemas from `@workspace/api-zod`.
- Do not add `zod` to api-server dependencies unless there is a strong reason — it complicates the workspace dependency graph.
