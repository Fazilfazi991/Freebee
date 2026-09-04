# Phase 1A validation record

Validated on 2026-09-04 on Windows 11 with Node 22.22.0 and pnpm 9.14.4.

| Check | Result | Notes |
|---|---|---|
| `pnpm install --frozen-lockfile` | Pass | Lockfile was up to date; install and Husky prepare completed. |
| `pnpm run lint` | Pass | No errors or warnings after LF normalization. |
| `pnpm run typecheck` | Pass | `functions/[[path]].ts` is intentionally outside pre-build application typechecking because it imports generated `build/server`. |
| `pnpm run test` | Pass | 4 files, 58 tests. |
| `pnpm run build` | Fail | Cloudflare Miniflare `workerd` crashes during Vite configuration with Windows structured exception `0xc0000005`; surfaced as `MiniflareCoreError [ERR_RUNTIME_FAILURE]: The Workers runtime failed to start`. No application compile result is produced. |
| `pnpm run dev` | Fail | Same `workerd` crash occurs before the dev server binds a port or prints a URL. |
| Browser smoke: `http://localhost:5173` | Fail | Browser returned `net::ERR_CONNECTION_REFUSED`, consistent with the server never binding. |
| WebContainer smoke | Blocked | The app document never loads, so `app/lib/webcontainer/index.ts` is not reached and no WebContainer can initialize. |

## Warnings observed

- Vite prints: `The CJS build of Vite's Node API is deprecated.` This originates in the current Remix/Vite integration.
- Remix prints that data fetching changes to single fetch in React Router v7 and suggests the `v3_singleFetch` future flag.
- Tests print `indexedDB is not available in this environment.` from browser-persistence initialization under the Node test environment; tests still pass.
- Parser tests intentionally emit extensive debug logs from `EnhancedMessageParser`; provider registration also emits informational logs.
- Dependency audit baseline: 7 critical, 134 high, 120 moderate, and 35 low advisories. See `SECURITY_BASELINE.md`.

## Interpretation

Node 22 resolves the unsupported-runtime ambiguity but not the Windows `workerd` host crash. The failure occurs in `miniflare@4.20251011.0` while Wrangler's Cloudflare proxy plugin requests bindings, before application routes or WebContainers execute. Linux CI should establish whether the production build itself is healthy; Windows remediation should be a focused Wrangler/Miniflare/workerd investigation or a documented WSL/container development path, not an application behavior change.
