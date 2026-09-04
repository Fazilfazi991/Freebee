# Secret custody audit

## Current state

The application accepts provider keys and integration tokens in browser settings, serializes key maps to JavaScript-readable cookies, and stores several integration connections in `localStorage`. Server routes parse those cookies and forward credentials to LLM, GitHub, GitLab, Netlify, Vercel, and Supabase APIs. `VITE_*` integration variables can also be bundled into client code. This is acceptable only for the upstream local-first trust model; it is not an acceptable multi-user SaaS custody model.

## Entry, storage, read, and transmission map

| Secret class | Entry/configuration | Current persistence/read path | Transmission | Classification |
|---|---|---|---|---|
| LLM API keys | Settings/API key UI; server environment | `apiKeys` cookie via `app/lib/api/cookies.ts`; server env via provider base class | `/api/chat`, `/api/llmcall`, model-list endpoints to provider SDK/API | High-risk user secret; cookie is JS-readable and sent broadly to origin routes. |
| Provider base URLs/settings | Provider settings UI | `localStorage` plus `providers` cookie | Server routes and provider clients | Sensitive configuration; may enable SSRF to user-controlled endpoints. |
| GitHub token | Settings or `VITE_GITHUB_ACCESS_TOKEN` | cookies and `github_connection` localStorage in GitHub stores | GitHub APIs and git proxy/system routes | High-risk OAuth/PAT; client-readable and duplicated. |
| GitLab token | Settings or `VITE_GITLAB_ACCESS_TOKEN` | cookies and `gitlab_connection` localStorage | GitLab APIs | High-risk OAuth/PAT; client-readable and duplicated. |
| Netlify token | Settings or `VITE_NETLIFY_ACCESS_TOKEN` | localStorage/cookie connection state | Netlify user/deploy routes and API | High-risk deployment credential; `VITE_*` may expose it in bundle. |
| Vercel token | Settings/API key map | browser persistence/cookies | Vercel user/deploy routes and API | High-risk deployment credential. |
| Supabase management token | Settings or `VITE_SUPABASE_ACCESS_TOKEN` | API-key cookie/server env | Supabase management API routes | High-risk cross-project management credential; must never be shipped as `VITE_*`. |
| AWS Bedrock credentials | Settings/server env | API-key map/cookie and env | AWS SDK | High-risk cloud credentials; multiple fields need one credential envelope. |
| MCP credentials/config | MCP settings UI | `bolt_mcp_settings` localStorage and server config route | MCP transports/tool invocations | Potential secret and command-capability material; server definitions need validation and isolation. |
| Project `.env` values | Generated/imported files and editor | IndexedDB/project filesystem/WebContainer | Generated processes and deployment payloads | User workload secrets; may leak to model context, exports, logs, or preview bundle. |

Additional browser persistence includes IndexedDB chat/file snapshots, localStorage settings/profile/history flags, and log cookies. These are not always secrets but may contain proprietary prompts, source, URLs, or error payloads.

## Required commercial boundary

- Browser submits a secret once over TLS to an authenticated server endpoint.
- Server encrypts it with envelope encryption or a managed vault and stores only a `SecretReference` in application tables.
- Browser receives masked metadata only; no plaintext retrieval endpoint.
- Runtime grants a short-lived, purpose-bound credential or performs the provider call server-side.
- Cookies contain opaque session identifiers only and are `HttpOnly`, `Secure`, and appropriately `SameSite`.
- Redaction is mandatory before logs, telemetry, model context, exports, bug reports, and error responses.
- Rotate and revoke credentials; record access in an audit log; scope integrations per workspace/project/environment.
- Block secrets from `VITE_*`, generated client bundles, persisted project snapshots, and deployment logs.
- Treat arbitrary provider/MCP base URLs as SSRF inputs: allowlist schemes, resolve/block private networks as appropriate, and enforce egress policy.

## Immediate Phase 1B priorities

Inventory cookie setters and duplicate connection stores, define the server-only secret API, remove plaintext export behavior, add redaction tests, and migrate one integration end-to-end before enabling authentication or multi-tenancy.
