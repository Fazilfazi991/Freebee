# Development baseline

## Supported toolchain

- Node.js: **22.22.0** (`.nvmrc`; `package.json` accepts the 22.x line from 22.22.0 onward)
- pnpm: **9.14.4** (`packageManager` in `package.json`)

Node 22 was selected because it is an LTS release supported by the repository's Remix/Vite/Cloudflare toolchain and remains supported beyond Node 20's March 2026 end of life. Node 24 is intentionally not the baseline: the initial Windows audit used Node 24 and `workerd` terminated with access violation `0xc0000005`. The same failure can still be host-specific, so CI on Linux is the authoritative build gate.

## Setup and canonical checks

```sh
nvm use
corepack enable
corepack prepare pnpm@9.14.4 --activate
pnpm install --frozen-lockfile
pnpm run dev
```

Run the same gates as CI with `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `pnpm run build`. The local URL is normally `http://localhost:5173`.

All repository text is stored as LF through `.gitattributes`; `.editorconfig` supplies matching editor defaults. Do not commit a regenerated lockfile unless dependencies intentionally changed.

## Generated Cloudflare entry point

`functions/[[path]].ts` is a Cloudflare Pages adapter that imports `build/server`, which does not exist before a production build. It is excluded from the application `tsc --noEmit` pass; the production build validates that deployment boundary after generating `build/server`.
