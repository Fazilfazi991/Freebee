# bolt.diy Architecture Audit

Audit date: 2026-09-04

Audited revision: `2e254ac19a696394030601bc602f54945b12bfc4` (`main`)
Upstream: `https://github.com/stackblitz-labs/bolt.diy.git`

## Executive summary

bolt.diy is a client-heavy Remix 2 application targeting Cloudflare Pages. React renders the chat, editor, terminal, and preview. The server brokers LLM and deployment API calls, while generated projects live and execute in a StackBlitz WebContainer in the browser. Chats and project snapshots are persisted only in the current browser's IndexedDB; settings, provider credentials, integration tokens, and deployment mappings are largely held in cookies or localStorage. There is no product user authentication, server-side project database, tenant boundary, billing, or durable multi-device storage.

The product is a strong prototype foundation: its chat/workbench interaction, streamed artifact protocol, editor, provider abstraction, and preview UX are reusable. It is not yet a safe multi-tenant SaaS foundation. The highest-priority architectural work is to introduce identity and authorization, server-side project persistence, secret custody, an execution-provider boundary, and dependency/security remediation before adding product features.

## Baseline and toolchain

| Area | Finding |
| --- | --- |
| Application framework | Remix 2 (`@remix-run/*` resolved to 2.16.8), using Vite 5.4.19 and Cloudflare Pages adapters |
| UI runtime | React 18.3.1 / React DOM 18.3.1 |
| Language | TypeScript 5.8.3, strict mode, no emit |
| Package manager | `pnpm@9.14.4` declared in `package.json`; lockfile resolved local pnpm dependency 9.15.9 |
| Node requirement | `>=18.18.0`; no upper bound and no `.nvmrc`/`.node-version` |
| Deployment target | Cloudflare Pages/Workers via Wrangler; Docker and Electron packaging also present |
| Source size | 375 TypeScript/TSX files under `app`, 38 route files, 22 provider modules |
| Root license | MIT, with required copyright/license notice retention |

The audit host had Node 24.19.0 in the bundled runtime. This satisfies the declared range, but the pinned Cloudflare `workerd`/Miniflare stack crashed on this Windows host. A commercial baseline should pin and test an LTS Node version (preferably 20 or 22 after validation) rather than accepting all future majors.

## Frontend architecture

- Remix file routes: `/` is `app/routes/_index.tsx`; `/chat/:id` reuses the index page through `app/routes/chat.$id.tsx`; API endpoints are colocated under `app/routes/api.*.ts`.
- `app/components/chat/Chat.client.tsx` owns the AI SDK `useChat` session, model/provider state, attachments, prompt submission, and persistence callbacks.
- `app/components/chat/BaseChat.tsx` composes the landing/chat/workbench shell. `app/components/chat/ChatBox.tsx` is the prompt composer. `Messages.client.tsx`, `AssistantMessage.tsx`, and `UserMessage.tsx` render the conversation.
- `app/components/workbench/Workbench.client.tsx` coordinates code/diff/preview views. CodeMirror 6 supplies editing; xterm.js supplies terminal rendering; resizable panels, Radix, Headless UI, UnoCSS, Sass, and Framer Motion supply UI primitives and styling.
- State is split between Nanostores (workbench, files, terminal, previews, settings, integrations, logs) and Zustand (MCP). Component-local React state and browser cookies are also used. This mixed ownership increases coupling and makes server synchronization harder.

## AI and LLM architecture

### Provider selection and abstraction

`LLMManager` in `app/lib/modules/llm/manager.ts` registers classes exported by `app/lib/modules/llm/registry.ts`. Each provider extends `BaseProvider` and returns an AI SDK `LanguageModelV1`. The server reads `[Model: ...]` and `[Provider: ...]` markers embedded in user message text, resolves static/dynamic models, and calls the selected provider.

Providers present at this revision:

- Anthropic, Amazon Bedrock, Cerebras, Cohere, DeepSeek, Fireworks, Google Gemini, Groq, Hugging Face, Hyperbolic, Mistral, Moonshot, Ollama, OpenAI, OpenRouter, OpenAI-compatible, Perplexity, Together, xAI, LM Studio, GitHub Models, and Z.ai.

OpenAI, Anthropic, Gemini, and OpenRouter are already supported. Future providers are reasonably easy to add by creating a `BaseProvider` subclass and exporting it from the registry. Remaining coupling to fix is: provider identity encoded in message text; static global provider constants used by UI/server; AI SDK v4 `LanguageModelV1` types throughout; provider-specific token/reasoning heuristics in the common stream layer; and browser-supplied API keys in every request. A provider-neutral `ModelGateway` contract with server-owned credentials, stable provider/model IDs, capability metadata, and normalized usage/errors would make this commercially maintainable.

### Prompt handling and code generation

- System prompts are in `app/lib/common/prompts/prompts.ts`, `new-prompt.ts`, `optimized.ts`, and `discuss-prompt.ts`.
- `app/lib/common/prompt-library.ts` selects prompt variants and injects working directory, HTML allowlist, design scheme, locked files, and optional Supabase values.
- `app/lib/.server/llm/stream-text.ts` sanitizes messages, chooses the provider/model, builds the system prompt, optionally injects selected file context/chat summary, and invokes Vercel AI SDK `streamText`.
- Context optimization uses `create-summary.ts` and `select-context.ts`, making extra model calls to summarize history and select up to five relevant files.
- Generated code is not a first-class structured tool call. The LLM is instructed to emit custom `<boltArtifact>` and `<boltAction>` tags. `message-parser.ts` and `enhanced-message-parser.ts` incrementally parse those tags and also auto-wrap some Markdown code fences.

### Streaming and tools

`app/routes/api.chat.ts` uses AI SDK `createDataStreamResponse`, merges `streamText` output, emits progress/message annotations, monitors recovery/continuation, and returns `text/event-stream`. `@ai-sdk/react` consumes that stream in the browser. A custom transform rewrites reasoning chunks into hidden thought markup. This protocol is effective but brittle: XML-like parsing, message-text metadata, custom stream chunk rewriting, and executable actions are tightly interleaved.

MCP is the only true model tool/function-call layer. `app/lib/services/mcpService.ts` creates stdio, SSE, or Streamable HTTP clients and exposes tool schemas without execute functions to the LLM. The UI asks the user to approve or reject; a later request executes approved tools and writes the result into the data stream. Configuration and headers are stored in localStorage and posted to singleton server state. There is no tenant isolation, URL allowlist, DNS-rebinding defense, command allowlist, or durable audit log. The singleton can leak one user's MCP configuration/tools into another request in a multi-user deployment and the installed MCP SDK has relevant high-severity advisories.

## Prompt-to-preview request flow

1. `ChatBox.tsx` captures text/files and calls handlers owned by `Chat.client.tsx`.
2. `Chat.client.tsx` optionally selects/imports a starter template, prepends model/provider markers, includes modified files and browser-held settings/API keys, and sends the conversation to `/api/chat` through AI SDK `useChat`.
3. `app/routes/api.chat.ts` validates/parses the body, optionally summarizes/selects context, restores approved MCP tool results, and configures the streamed response.
4. `app/lib/.server/llm/stream-text.ts` chooses a `BaseProvider`, builds the system prompt, converts messages, and streams from the provider through Vercel AI SDK.
5. The model emits prose plus `<boltArtifact>` / `<boltAction type="file|shell|start|supabase">` markup. The browser receives incremental data-stream chunks.
6. `useMessageParser` feeds the response to `message-parser.ts`/`enhanced-message-parser.ts`; callbacks in the workbench create artifacts and enqueue actions.
7. `WorkbenchStore` and `ActionRunner` stream file content into editor state, write completed files through `FilesStore` to `webcontainer.fs`, and run shell/start commands through the WebContainer shell.
8. WebContainer `server-ready`/`port` events populate `PreviewsStore`. `Preview.tsx` loads the generated `*.webcontainer-api.io` URL in an iframe, while `inspector-script.js` forwards inspection and runtime errors.
9. Conversation messages and a WebContainer filesystem snapshot are stored in browser IndexedDB by `useChatHistory.ts` and `db.ts`. Reopening the same browser chat restores the snapshot into the WebContainer.

## Filesystem, execution, terminal, and preview

- WebContainer is initialized at module load in `app/lib/webcontainer/index.ts` with `WebContainer.boot({ coep: 'credentialless', workdirName: 'project', forwardPreviewErrors: true })`. It installs `public/inspector-script.js` and subscribes to preview exceptions.
- `app/lib/stores/files.ts` watches `webcontainer.internal.watchPaths`, mirrors the virtual filesystem into a Nanostore map, and performs read/write/mkdir/rm operations.
- `app/lib/runtime/action-runner.ts` executes file, shell, start, Supabase, and deployment actions. AI-produced shell commands are therefore executable code.
- `app/utils/shell.ts` spawns `/bin/jsh`; `TerminalStore` owns processes and `Terminal.tsx`/`TerminalManager.tsx`/`TerminalTabs.tsx` render and manage xterm terminals.
- `PreviewsStore` listens for ports and server readiness. `Preview.tsx`, `PortDropdown.tsx`, and the `webcontainer.preview.$id.tsx` route present previews; BroadcastChannel/localStorage synchronization refreshes tabs.
- Search, folder import/export, Git operations, build packaging, and all deployment clients read from the WebContainer filesystem.

### WebContainer dependency map and replacement feasibility

Features depending directly on WebContainers include project boot, file watching and mutations, snapshot export/import, shell/terminal sessions, package installation and dev servers, port discovery, live preview URLs, runtime error forwarding/inspection, text search, isomorphic-git's filesystem adapter, folder/Git imports, and collecting build/source files for GitHub/GitLab/Netlify/Vercel deployment.

Replacing WebContainers with E2B or another remote sandbox is feasible, but not a package swap. Introduce a server-side `ExecutionEnvironment` interface before migration:

- lifecycle: create/resume/stop sandbox per authenticated project;
- filesystem: list/read/write/delete/watch/snapshot/restore;
- processes: spawn, stdin, resize, kill, stdout/stderr, exit status;
- networking: port-ready events and authenticated preview URL creation;
- Git/import/export and build artifact collection;
- capability/error/event types independent of `@webcontainer/api`.

Then move action execution from the browser to authenticated server jobs, stream filesystem/process events back over SSE/WebSocket, replace direct `webcontainer.fs` calls in stores/hooks/deployers with service calls, store sandbox/project IDs server-side, and proxy or sign preview URLs. Keep the existing workbench as a client projection of remote state. During transition, implement both `WebContainerExecutionEnvironment` and `RemoteSandboxExecutionEnvironment` behind a feature flag. This also creates the policy point needed for command limits, network egress controls, quotas, cancellation, and audit logs.

## Persistence, projects, and integrations

- `app/lib/persistence/db.ts` opens IndexedDB `boltHistory` version 2 with `chats` and `snapshots` stores. There is no server database dependency.
- `useChatHistory.ts` creates IDs, saves messages, exports/imports chats, serializes `webcontainer.export('.')`, and restores snapshots. Persistence is browser- and profile-local, not permanent SaaS storage.
- A "project" is effectively a chat plus WebContainer snapshot and optional Git/deployment metadata; there is no authoritative project domain model or ownership record.
- Git uses `isomorphic-git` over a WebContainer filesystem adapter in `useGit.ts`. GitHub uses Octokit plus API proxy/routes and token-based settings; GitLab has analogous custom fetch code. Personal tokens are stored client-side.
- Supabase integration is a management-token convenience integration, not application persistence or authentication. UI/stores keep an access token and project credentials locally; server routes proxy Management API calls, including arbitrary database SQL submitted after a UI confirmation. No `@supabase/supabase-js`, schema, migration set, RLS, or app auth exists.
- Deployments: Cloudflare deploys this host application; generated projects can be sent to Vercel, Netlify, GitHub, or GitLab. Deployment routes accept caller-supplied bearer tokens and files and have no app authentication/authorization, quotas, CSRF protections, or ownership enforcement.
- Electron desktop packaging, updater, Docker, and Cloudflare Pages functions are present. Decide whether Electron remains a supported commercial surface; otherwise remove it only after the web architecture is stable.

## Environment and secrets

Documented variables: `ANTHROPIC_API_KEY`, `AWS_BEDROCK_CONFIG`, `CEREBRAS_API_KEY`, `COHERE_API_KEY`, `DEEPSEEK_API_KEY`, `FIREWORKS_API_KEY`, `GITHUB_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY`, `HuggingFace_API_KEY`, `HYPERBOLIC_API_BASE_URL`, `HYPERBOLIC_API_KEY`, `LMSTUDIO_API_BASE_URL`, `MISTRAL_API_KEY`, `MOONSHOT_API_KEY`, `OLLAMA_API_BASE_URL`, `OPEN_ROUTER_API_KEY`, `OPENAI_API_KEY`, `OPENAI_LIKE_API_BASE_URL`, `OPENAI_LIKE_API_KEY`, `PERPLEXITY_API_KEY`, `TOGETHER_API_BASE_URL`, `TOGETHER_API_KEY`, `XAI_API_KEY`, `ZAI_API_KEY`, `DEFAULT_NUM_CTX`, `NODE_ENV`, `PORT`, `VITE_LOG_LEVEL`, and `VITE_*` tokens/URLs for GitHub, GitLab, Netlify, Supabase, and Vercel.

Anything prefixed `VITE_` is bundled/exposed to the browser. The current design deliberately supports browser-held personal tokens and sends AI keys in request bodies. For SaaS, provider/deployment/management credentials must be encrypted server-side or held in a managed secrets service; service-role keys must never be exposed. Supabase anon/publishable keys may be public only with correct RLS, but access/management tokens must remain server-side.

## Logging, error handling, analytics, and tests

- `app/utils/logger.ts`, `debugLogger.ts`, `app/lib/stores/logs.ts`, API error wrappers, toasts, React error boundaries, and preview error forwarding provide extensive console/in-memory logging.
- Some logs include prompts, SQL, model/provider details, terminal output, connection state, and potentially integration/API error bodies. There is no consistent redaction, correlation ID, server log sink, retention policy, or user-visible audit trail.
- Cloudflare telemetry is disabled (`send_metrics = false`). No product analytics or error-monitoring vendor dependency was found.
- Vitest is configured through `vite.config.ts`; only three test files exist: parser (45 tests), Markdown (6), and diff (1). Preview Playwright configuration exists, but `tests/preview/**` is excluded and no such checked-in test suite was found. There are no API, provider, persistence, integration, security, or end-to-end SaaS tests.

## Dependency and licensing audit

### Current issues

`pnpm outdated` marks `react-beautiful-dnd`, `@types/electron`, `@types/diff`, and `@types/react-window` deprecated. Major-version lag is substantial in Remix/React Router, Vite, Vitest, AI SDK/provider packages, MCP SDK, Electron, Wrangler, UnoCSS, Nanostores, xterm, jsPDF, and several build tools. This is not a recommendation to bulk-upgrade; upgrades should be staged with protocol and UI regression tests.

The 2026-09-04 `pnpm audit` result is: 7 critical, 134 high, 120 moderate, 35 low across 1,803 dependency entries. Particularly relevant direct or reachable findings include:

- critical Remix/React Router file-session path traversal, React Router XSS/SSR XSS/DoS;
- critical/high jsPDF injection, local-file inclusion, JavaScript/PDF object injection, and image DoS;
- high MCP SDK cross-client data leak, ReDoS, and DNS-rebinding defaults;
- high Electron vulnerabilities and updater credential leakage;
- high `js-cookie` prototype/cookie attribute injection;
- high `jsondiffpatch` prototype pollution under AI SDK;
- high Wrangler command injection, Vite Windows deny bypass, and numerous build/archive parser issues;
- critical `fast-xml-parser` under the Bedrock SDK and critical Vitest UI arbitrary-file access (development exposure).

Many findings are development/build-only, but the application also has runtime/direct exposures. Phase 1 security remediation must classify reachability and upgrade/override safely before any public multi-user deployment.

### Vendor and license considerations

- Root code is MIT and permits commercial use, modification, distribution, sublicensing, and sale, provided notices are retained.
- Installed runtime packages are predominantly permissive (MIT/Apache/BSD/ISC). The scan found four transitive packages with unknown metadata (`atomically`, `require-like`, `spawn-command`, `stubborn-fs`) that require manual source-license verification. Artistic-2.0, CC-BY, MPL-or-Apache, BlueOak, WTFPL, and dual-license entries require inclusion in a generated third-party notice/SBOM process; JSZip permits choosing MIT rather than GPL.
- `@webcontainer/api@1.6.1-internal.1` declares MIT in its package metadata, but the unusual internal build, hosted preview infrastructure, StackBlitz trademarks, service terms, usage limits, and any production/commercial WebContainer licensing must be confirmed directly with StackBlitz counsel/account representatives. Package metadata alone does not grant rights to a hosted service.
- Provider APIs, GitHub/GitLab, Vercel, Netlify, Supabase, and generated templates/assets each have separate terms, acceptable-use, data-processing, attribution, and trademark obligations.
- Generated projects may install arbitrary dependencies selected by an LLM. The SaaS needs dependency-policy scanning, notices/SBOM generation, and controls against copyleft/noncommercial or malicious packages before publishing.

This is a technical inventory, not legal advice.

## Security-sensitive areas

1. Unauthenticated API routes can proxy paid LLM, deployment, Git, Supabase, web-search, and MCP operations.
2. API keys and personal access tokens are placed in cookies/localStorage, `VITE_*` bundles, or request bodies; XSS has a large blast radius.
3. AI output can write arbitrary project files and execute arbitrary shell commands. WebContainers isolate the host better than local execution, but prompt injection can still exfiltrate accessible secrets and abuse network/API quotas.
4. MCP stdio allows configured local command execution; remote MCP URLs permit SSRF/DNS rebinding and headers may contain secrets. Global singleton state is unsafe for tenants.
5. Supabase Management API routes accept project IDs and SQL with caller-provided bearer tokens. There is no ownership check or query policy.
6. Deployment routes accept arbitrary file sets and tokens, poll synchronously for up to roughly two minutes, and lack size/count/rate limits.
7. Git proxy/import and URL-fetch/search routes need strict destination allowlists, redirect/IP validation, response-size/time limits, and credential redaction.
8. Preview iframes execute untrusted generated applications. Isolation headers, iframe sandbox policy, cross-origin messaging validation, and preview-domain cookie separation need dedicated review.
9. Custom XML-like action parsing, raw Markdown handling, inspector messaging, ZIP/PDF import/export, path normalization, and filesystem delete/write operations are parser/path-traversal surfaces.
10. There is no tenant-aware authorization, durable audit log, abuse prevention, quota enforcement, or centralized secret rotation.

## Verification results

| Check | Result |
| --- | --- |
| Frozen install | PASS with declared pnpm 9.14.4; 1,623 packages linked; lockfile unchanged |
| Tests | PASS: 3 files, 52 tests; warnings for Vite CJS API, Remix v7 single-fetch migration, and unavailable IndexedDB in one test environment |
| Lint | FAIL: 139,304 errors across 375 files, entirely `linebreak-style` and duplicate Prettier CRLF findings caused by Windows checkout (`core.autocrlf=true`); no other lint rules failed |
| Typecheck | FAIL: `functions/[[path]].ts(5,37)` cannot find generated `../build/server`; build did not complete first |
| Production build | FAIL before compilation: Miniflare/`workerd` access violation (`0xc0000005`) and `ERR_RUNTIME_FAILURE` while Cloudflare proxy plugin starts |
| Development server | FAIL for the same `workerd` crash before Vite prints a URL |
| Local URL | No working URL on this host. The intended development URL is normally `http://localhost:5173`, but it was never bound. |
| Dependency audit | FAIL: 7 critical, 134 high, 120 moderate, 35 low |

The initial attempt with host pnpm 11 also failed because it would not operate non-interactively on a modules directory produced by pnpm 9. Rerunning with the repository-declared pnpm version resolved that tool mismatch without changing the repository. No functional source fix was made because the observed run/build failure is in the local Cloudflare runtime/toolchain, and changing application code would not be justified by the audit.

## KEEP / MODIFY / REPLACE / REMOVE recommendation

### KEEP

- Chat/workbench/editor/terminal/preview interaction model and most presentational components.
- Streamed response UX, progress annotations, message parsing tests, file diff/locking concepts, import/export, and provider class registry as migration inputs.
- CodeMirror, xterm, React component structure, Git workflows, and deployment UX concepts.
- MIT notices and upstream attribution.

### MODIFY

- Stabilize the existing Remix app first; decide Next.js only through an ADR and proof-of-concept, not a rewrite assumption.
- Upgrade AI SDK/provider adapters behind a provider-neutral gateway; stop encoding model/provider in message text.
- Move credentials, provider selection policy, usage metering, deployment calls, and MCP configuration to authenticated server-side services.
- Normalize state ownership and introduce project/revision/job domain models.
- Harden parsing, paths, URL fetching, preview messaging, logging/redaction, limits, cancellation, and deployment pipelines.
- Expand tests before dependency/framework upgrades.

### REPLACE

- Browser-only IndexedDB as source of truth with Supabase/Postgres (or equivalent), object storage, versioned file manifests/snapshots, and RLS-backed ownership.
- Direct WebContainer imports with an execution abstraction; optionally retain WebContainers as one adapter while adding E2B/remote isolation.
- Client-held PAT flows with OAuth/GitHub App and installation-scoped credentials; replace client-held deployment tokens with platform integrations.
- Global MCP/provider singleton state with request/tenant-scoped services and policy enforcement.
- Deprecated `react-beautiful-dnd` and obsolete type stubs after regression coverage exists.

### REMOVE (only in later approved phases)

- Demo/debug logs and thought-stream markup that risks exposing model reasoning.
- Unneeded providers, desktop packaging, local-provider setup, or duplicate state/persistence layers once commercial product scope is decided.
- Browser-exposed management tokens and unauthenticated proxy endpoints after their replacements are live.
- Dead/generated artifacts such as timestamped Vite config output if confirmed unneeded.

Do not remove any of these during the audit phase.

## Recommended next phase

Begin Phase 1 foundation/hardening, not feature development: establish a reproducible Node/pnpm CI baseline; remediate critical/high reachable vulnerabilities; add authentication and authorization boundaries; define project/revision/execution-provider contracts; move secrets server-side; and add characterization/integration tests around the existing prompt-to-preview flow. Only after those contracts are proven should the team choose Remix versus Next.js, Supabase persistence details, and WebContainer versus E2B rollout.
