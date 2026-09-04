# Production deployment

## Supported build path

- Linux CI or a Linux deployment builder
- Node 22.22.x (the repository engine range is `>=22.22.0 <23`)
- Corepack with the lockfile-selected pnpm version
- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`, `pnpm run lint`, `pnpm test -- --run`, then `pnpm run build`

The application uses Remix with the Cloudflare adapter and `wrangler.toml`. The Windows host currently crashes while Miniflare starts with a native access violation; application code must not be changed to mask that host-runtime defect. Linux CI is the reproducible release gate.

Before deployment, replace centralized placeholders in `app/config/platform.ts`, review environment bindings and secrets, run the route/SEO/browser checks against the release artifact, and configure the chosen canonical domain. No workflow in this repository should auto-deploy without separately approved credentials.
