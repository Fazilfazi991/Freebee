# Cloudflare and local runtime modes

## Supported development modes

- `pnpm dev` runs the existing Cloudflare-oriented path, including `pre-start.cjs` and the Cloudflare dev proxy.
- `pnpm dev:local` runs Remix/Vite in `localdev` mode without the Cloudflare dev proxy. This is the reliable Windows/local Node path for UI and route development.
- Production continues to build for Cloudflare Pages through `functions/[[path]].ts`, `wrangler.toml`, and the normal production build.

`vite.config.ts` conditionally omits Cloudflare-specific dev integration in `localdev`. `app/entry.server.tsx` uses React's Web Stream renderer when available and a `renderToString`-backed Web Stream fallback under Node. This is a compatibility seam, not a production-runtime migration.

## Limitations

Local Node mode does not prove Cloudflare bindings, Workers compatibility, Pages routing, or deployment behavior. Those require Linux CI and, before release, a Cloudflare preview. Conversely, Wrangler/workerd failures on Windows should not block UI development when `dev:local` works.

Use the required Node 22 line and pinned pnpm version. Node 24 is outside the declared engine range and is not a release-test environment.

## Linux CI status

`.github/workflows/ci.yaml` defines Ubuntu lint, typecheck, tests, credential guard, production build, Docker production/development builds, and Compose validation. Local Windows execution cannot certify it. Record an actual GitHub Actions run URL and commit SHA before treating Linux CI as passed.
