# Local development

## Required runtime

Use Node.js 22.22.0 on every platform. The repository pins this version in `.nvmrc` and restricts `package.json` to Node 22 (`>=22.22.0 <23`). Node 24 is outside the supported range for this project.

The repository uses pnpm 9.14.4 through Corepack:

```powershell
nvm use
corepack enable
corepack prepare pnpm@9.14.4 --activate
pnpm install --frozen-lockfile
```

If `nvm use` is unavailable, install Node.js 22.22.0 with your preferred Windows Node version manager, open a new terminal, and verify:

```powershell
node --version
pnpm --version
```

Expected versions are `v22.22.0` and `9.14.4`.

## Windows frontend development

Use the frontend-only development mode on Windows:

```powershell
pnpm run dev:local
```

Open <http://127.0.0.1:5173/>. This command binds Vite explicitly to `127.0.0.1`, renders the public pages and browser-side tools, and does not start Cloudflare's local worker runtime. `/builder` renders normally, but features that require Cloudflare bindings or server-side worker execution are unavailable; the command does not simulate backend responses.

This mode does not change the production Cloudflare configuration.

## Cloudflare-backed development

The standard command is:

```powershell
pnpm run dev
```

Its local startup path is:

```text
Remix CLI -> Vite -> Remix Cloudflare development proxy -> Wrangler/Miniflare -> workerd
```

Use this mode only when local Cloudflare bindings or worker behavior are required and workerd starts successfully on the machine.

## Troubleshooting HTTP 504

A 504 at `127.0.0.1:5173` can occur when a browser or local proxy still targets a Vite endpoint after its Cloudflare worker backend has crashed. Check the terminal immediately before the 504.

If it contains both of these messages, increasing a proxy timeout will not help:

```text
Received structured exception #0xc0000005: access violation
MiniflareCoreError [ERR_RUNTIME_FAILURE]: The Workers runtime failed to start
```

On affected Windows systems, stop the failed process and use `pnpm run dev:local` for public pages and browser-side tool work. There should be a Node/Vite listener on port 5173 and no `workerd.exe` process in frontend-only mode.

To inspect the listener in PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen
```

## Troubleshooting a native workerd crash

The installed Cloudflare stack may fail during Vite startup on Windows with native access violation `0xc0000005`. In that failure, workerd is the crashing process; Miniflare reports `ERR_RUNTIME_FAILURE`, and Remix's Cloudflare development proxy cannot finish configuring Vite. Requests do not reach Remix.

Before investigating further:

1. Confirm Node is exactly 22.22.0. Node 24 is not supported by this repository.
2. Confirm pnpm is 9.14.4.
3. Reinstall from the existing lockfile with `pnpm install --frozen-lockfile`.
4. Retry `pnpm run dev` and capture the terminal output before changing dependencies.
5. If the native access violation remains, use `pnpm run dev:local`. Do not mask the crash by increasing request timeouts.

The currently locked worker stack is Wrangler 4.44.0, Miniflare 4.20251011.0, and workerd 1.20251011.0. Their declared Node engine ranges include Node 22, but that compatibility declaration does not prevent this Windows-native crash.
