# Security baseline

Audit date: 2026-09-04. Command: `pnpm audit --json` with pnpm 9.14.4 and the committed lockfile. This is a triage baseline, not a statement that vulnerable code is exploitable in every deployment.

## Summary

The lockfile audit reports **296 advisories across 1,803 dependencies: 7 critical, 134 high, 120 moderate, and 35 low**. Production reachability below is a conservative static assessment. Runtime exploitability must be retested after dependency upgrades.

## Critical advisories

| Installed package/version | Advisory | Dependency path | Reachability | Remediation and compatibility risk |
|---|---|---|---|---|
| `@remix-run/node@2.16.8` | [GHSA-9583-h5hc-x8cw](https://github.com/advisories/GHSA-9583-h5hc-x8cw), FileSessionStorage path traversal | Direct production dependency; also through `remix-utils` | Production-reachable if filesystem session storage is enabled; current Cloudflare path does not appear to instantiate it | Upgrade the Remix/React Router family together to a patched release. Potentially breaking because route/build/runtime packages must remain aligned. |
| `fast-xml-parser@5.2.5` | [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2), entity encoding bypass/regex injection | `@ai-sdk/amazon-bedrock` → AWS SDK XML parser | Production-reachable when Bedrock handles attacker-influenced XML/service responses | Override/upgrade to a patched parser through a compatible AWS/AI SDK release. Low application API risk, but lockstep SDK changes may alter Bedrock behavior. |
| `jspdf@2.5.2` | [GHSA-wfv2-pwc8-crg5](https://github.com/advisories/GHSA-wfv2-pwc8-crg5), HTML injection when opening a new window | Direct production dependency | Reachable if untrusted HTML is rendered/exported through jsPDF | Upgrade jsPDF to a patched current major and test export rendering. Major-version behavior and plugin compatibility may change. |
| `jspdf@2.5.2` | [GHSA-f8cm-6447-x5h2](https://github.com/advisories/GHSA-f8cm-6447-x5h2), local file inclusion/path traversal | Direct production dependency | Browser deployment reduces local-file exposure; Electron/server-side use raises reachability | Same jsPDF upgrade; prohibit untrusted paths/URLs and keep PDF generation out of privileged contexts. Potential major-version break. |
| `shell-quote@1.8.3` | [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p), newline escaping issue | Dev-only `concurrently@8.2.2` | Development/build tooling; not shipped as application runtime code | Upgrade `concurrently`/resolved `shell-quote` to a patched line. Low product compatibility risk; retest scripts on Windows and Linux. |
| `tar@6.2.1` | [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw), archive parsing/decompression denial of service | Remix development tooling and Electron builder chains | Build/packaging reachable; potentially processes downloaded archives | Upgrade transitive parents or override to patched `tar` where semver permits. Packaging changes need Electron and Docker build tests. |
| `vitest@2.1.9` | [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp), UI server arbitrary file read/execute | Direct development dependency | Only reachable when Vitest UI/API server is exposed; CI test command is non-UI | Upgrade Vitest to a patched supported major, keep its server loopback-only, and retest snapshots/config. Major upgrade may require config changes. |

## High advisories grouped by subsystem

| Group | Representative affected packages/paths | Exposure | Required treatment |
|---|---|---|---|
| Request routing and SSR | Remix/React Router packages | XSS, open redirect, header/response and denial-of-service classes on production routes | Upgrade the Remix family atomically; add route and streaming regression tests. |
| MCP | `@modelcontextprotocol/sdk@1.16.0` | Cross-client data leakage, DNS rebinding, ReDoS and transport validation risks | Upgrade before exposing MCP in SaaS; authenticate sessions, bind ownership, validate origins/hosts, and isolate transports. |
| PDF/export | `jspdf` and related parsing paths | Injection, path and denial-of-service risks with untrusted generated content | Upgrade; sandbox privileged generation and fuzz URLs/HTML/assets. |
| Desktop | Electron 33 and electron-builder/archive chain | Renderer, navigation, IPC and packaging attack surface | Upgrade Electron on its own tested track; enforce context isolation, navigation allowlists and no Node integration. Consider removing desktop distribution from SaaS scope. |
| AI/provider SDKs | Vercel AI SDK adapters, `jsondiffpatch`, AWS XML chain | Provider response parsing and object/prototype manipulation | Upgrade adapters together and add provider contract tests; validate structured tool output. |
| Development server/build | Vite, Wrangler/miniflare/workerd, pnpm, tar/archive packages | Dev-server file exposure, build compromise and archive DoS | Never expose dev servers publicly; pin actions/toolchain; upgrade after compatibility tests. |
| Browser state/cookies | direct `js-cookie` plus connection stores | Token theft through XSS and oversized/scope-wide cookies | Replace plaintext credential cookies/localStorage with server custody and HttpOnly sessions. |

Moderate and low findings are primarily nested parser, glob, development-server, archive, source-map, and utility advisories. They remain tracked: refresh the machine-readable audit in every dependency PR, fail CI on newly introduced critical vulnerabilities, and set a time-bounded exception owner for unresolved highs.

## Commercial release gates

1. Zero unaccepted critical advisories in production or build supply chain.
2. Every remaining high has an owner, reachability proof, compensating control, and expiry date.
3. Lockfile-only upgrades first; then coordinated Remix/Vite/AI SDK/Electron majors with characterization tests.
4. Dependency licenses and notices are generated from the exact production graph and reviewed by counsel.
5. Secrets leave browser storage, arbitrary egress is controlled, generated shell actions run in isolated disposable sandboxes, and deployment endpoints enforce authentication/tenant authorization.
