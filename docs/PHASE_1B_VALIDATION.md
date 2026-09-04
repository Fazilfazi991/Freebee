# Phase 1B validation record

Date: 2026-09-04

## Scope and repository integrity

Unexpected commit `b02e0c99285f20045192c53a4e39865029253ae7` was inspected and retained. It introduces a generic online-tools platform, moves the builder entry to `/builder`, adds dynamic tool routing and browser analytics, and materially expands the file-processing/UI attack surface. It does not invalidate Phase 1A, but it is an independently authored product-direction change requiring separate product, privacy, security, and licensing review.

A later concurrent commit, `fdb8a63d2219c9817172cf4bf21a027b92745f6c`, added browser PDF/image utility engines. Phase 1B preserved it. Unrelated concurrent edits to `vite.config.ts` and `app/lib/fetch.ts` are excluded from Phase 1B commits.

## Checks

| Check | Result | Notes |
| --- | --- | --- |
| Phase 1B typecheck before dependency update | Pass | Node 22.22.0 / pnpm 9.14.4 |
| Focused execution and secret-store tests | Pass | 3 files, 9 tests |
| Typecheck | Pass | Also passed in the commit hook after dependency updates |
| Lint | Pass | Commit hook, no lint errors |
| Tests | Pass | Vitest 3.2.6: 10 files, 74 tests |
| Credential guard | Pass | No forbidden client credential was populated |
| Production build | Fail | Windows workerd access violation; Miniflare `ERR_RUNTIME_FAILURE` while starting the Cloudflare proxy |
| Local-mode build | Fail | `node:buffer` is externalized while `files.ts` imports `Buffer`; local development remains usable but local production-mode bundling is not |
| Local browser smoke test | Partial pass | `/` loaded as “Tool Platform — Useful tools, one calm workspace”; `/builder` loaded as “AI Website Builder” at `http://127.0.0.1:5174/` |
| Linux CI | Not locally certified | Workflow exists; requires a hosted Ubuntu run for proof |

Known warnings include Vite's deprecated CJS Node API notice, the React Router v7 single-fetch future warning, the Remix/Wrangler peer-range mismatch, deprecated `@types/electron`, deprecated `react-beautiful-dnd`, and deprecated transitive packages reported by pnpm.

The local server also logged a missing `ph:git-repository` UnoCSS icon and server-render-time `indexedDB is not available` messages. WebContainer boot/terminal/preview execution was not exercised because doing so requires generating or importing a project and provider credentials; adapter lifecycle behavior is covered by focused tests.

## Secret boundary

OpenAI is the first migrated provider credential. The browser submits it to `/api/secrets/openai`; an HttpOnly, SameSite session cookie identifies a server-side store; API routes merge the retrieved value server-side; secret-list responses expose metadata only. The legacy browser `apiKeys` cookie is cleared for OpenAI.

The current `MemorySecretStore` is explicitly development-only: it is process-local, unauthenticated beyond an opaque cookie, unencrypted in memory, non-durable, and unsuitable for horizontal scaling. Production must replace it with an authenticated, tenant-scoped encrypted secret service. Other provider keys and integration access tokens remain legacy client-managed paths.

## Client environment classification

Public/client-safe when configured correctly: `VITE_APP_VERSION`, `VITE_DISABLE_PERSISTENCE`, `VITE_GIT_BRANCH`, `VITE_GIT_COMMIT`, `VITE_LOG_LEVEL`, provider token-type selectors, `VITE_GITLAB_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` (only with correct RLS).

Must never ship to the client: `VITE_GITHUB_ACCESS_TOKEN`, `VITE_GITLAB_ACCESS_TOKEN`, `VITE_VERCEL_ACCESS_TOKEN`, `VITE_NETLIFY_ACCESS_TOKEN`, and `VITE_SUPABASE_ACCESS_TOKEN`. `scripts/check-client-env.mjs` fails CI/build validation when any is populated. Existing legacy references remain migration work; the guard prevents configured secrets from entering CI builds.

## Dependency remediation

The starting audit reported 7 critical, 134 high, 120 moderate, and 35 low advisories. Phase 1B upgrades the aligned Remix packages to 2.17.2, jsPDF to 4.2.1, and Vitest to 3.2.6. These address four critical advisory entries. Critical transitive findings through `fast-xml-parser`, `shell-quote`, and `tar` remain explicit release blockers pending compatible parent upgrades and regression coverage; unsafe cross-major overrides were not used.

The post-upgrade lockfile audit reports 3 critical, 113 high, 90 moderate, and 26 low advisories across 1,883 dependencies (232 total). Counts changed both because of the targeted upgrades and because the concurrently added PDF/image tooling changed the dependency graph.

Direct `@webcontainer/api` imports numbered 10 before Phase 1B and still number 10 in total: `ActionRunner` stopped importing it while the new adapter necessarily imports it. The important coupling measure is ordinary generated-action code, where direct imports fell from one to zero. Remaining imports are the adapter plus nine bootstrap/auth/connect, store, Git, search, and shell migration-inventory sites.

## Exit decision

Phase 1B creates viable seams but does not authorize Phase 1C. The next phase should begin only after hosted Linux CI passes, remaining critical advisories are resolved or formally accepted, the server secret store is replaced with authenticated durable custody, and remaining direct WebContainer consumers have an agreed migration sequence.
