# Environment variables

Release rule: variables prefixed `VITE_` are public and may enter browser bundles. Never store a secret in one. Production must use Node `>=22.22.0 <23` and leave development-only local endpoints unset unless the builder explicitly needs them.

| Class | Variables / examples | Release handling |
| --- | --- | --- |
| Public | `VITE_PUBLIC_SITE_URL`, `VITE_PUBLIC_BETA`, `VITE_LOG_LEVEL`, public provider URLs/models | Safe for browser visibility. `VITE_PUBLIC_SITE_URL` must be the final HTTPS origin; the placeholder intentionally blocks launch approval. |
| Server-only | `PORT`, `DEFAULT_NUM_CTX`, provider base URLs without `VITE_`, `BUG_REPORT_REPO` | Configure only where the server/runtime needs them. Localhost provider URLs are development-only. |
| Secret | Provider API keys, `GITHUB_TOKEN`, `GITHUB_ACCESS_TOKEN`, `GITHUB_BUG_REPORT_TOKEN`, `NETLIFY_TOKEN`, `AWS_BEDROCK_CONFIG` | Secret store/runtime binding only; never commit or expose to client code. |
| Optional | Social URLs, feedback URL, integrations not required by the browser-local tools | Leave unset; features must degrade safely. |
| Development-only | `NODE_ENV=development`, `VITE_APP_PATH_ROOT`, local Ollama/LM Studio URLs | Do not copy into the production environment. |

## Release blocker: legacy public tokens

The inherited builder supports `VITE_GITHUB_ACCESS_TOKEN`, `VITE_GITLAB_ACCESS_TOKEN`, `VITE_VERCEL_ACCESS_TOKEN`, `VITE_NETLIFY_ACCESS_TOKEN`, and `VITE_SUPABASE_ACCESS_TOKEN`. Because `VITE_` values are public, these must remain **unset in production**. Moving privileged integrations behind server-only credentials is separate, explicitly scoped work; it was not attempted during release stabilization.

No `.env` file or real value belongs in Git. CI should supply server secrets through its secret store. The public tools require no secrets.
