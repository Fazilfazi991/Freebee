# Freebee Tools

Freebee Tools is a registry-driven collection of focused online utilities for documents, images, media, calculators, business workflows, and developer tasks. Browser-capable tools process files locally whenever possible.

## Development

Requirements:

- Node.js 22.22
- pnpm 9.14

```bash
pnpm install
pnpm dev
```

The local site is served by Remix and Vite. Set the optional public configuration in `.env.local`:

```bash
VITE_PUBLIC_SITE_URL=http://localhost:5173
VITE_PUBLIC_BETA=true
```

## Validation

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

## Architecture

- `app/lib/tools/registry.ts` defines categories and tools.
- `app/components/platform/` contains the shared site and tool interfaces.
- `app/lib/tools/` contains browser-side processing engines.
- `app/routes/` contains the public catalog, tool, category, legal, and operational routes.

See `docs/TOOLS_PLATFORM_ARCHITECTURE.md` for more detail.
