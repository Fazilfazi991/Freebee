# Commercial SaaS Migration Plan

This roadmap starts from audited revision `2e254ac19a696394030601bc602f54945b12bfc4`. It intentionally proposes no Phase 2 implementation during the audit.

## Principles

- Preserve the working chat/workbench experience while replacing infrastructure behind explicit contracts.
- Establish identity, authorization, secret custody, isolation, observability, and durable persistence before growth features.
- Treat generated code and commands as untrusted.
- Keep provider, database, deployment, and sandbox vendors behind product-owned interfaces.
- Use characterization tests and gradual adapters rather than a simultaneous framework/runtime rewrite.

## Phase 0 — Baseline audit (completed by these documents)

- Record revision, architecture, request flow, dependencies, security surfaces, licenses, and current checks.
- Make no functional product changes.
- Exit evidence: `ARCHITECTURE_AUDIT.md`, `REPO_MAP.md`, this roadmap, and a documentation-only commit.

## Phase 1 — Reproducible and secure foundation

1. Pin an LTS Node version and the exact pnpm version; add `.node-version`/Corepack policy and CI on Linux plus supported developer OSes.
2. Fix line-ending policy without mass-changing unrelated source in one opaque commit; make lint results portable.
3. Fix build/typecheck ordering/configuration so clean-checkout `typecheck`, test, build, and a smoke-start all pass independently.
4. Triage the audit by reachability, then upgrade/override critical and high vulnerabilities. Prioritize Remix/React Router, jsPDF, MCP SDK, AI SDK, Electron, Wrangler/Vite, and browser credential packages.
5. Add characterization tests for prompt submission, streamed artifact parsing, file writes, shell/start actions, preview readiness, snapshot restore, provider selection, and deploy payloads.
6. Write ADRs for framework (stay on Remix/React Router versus Next.js), database, execution sandbox, preview isolation, and deployment ownership.
7. Define initial domain contracts: `User`, `Workspace`, `Project`, `ProjectRevision`, `Conversation`, `Message`, `Generation`, `ExecutionSession`, `Deployment`, and `IntegrationConnection`.

Exit criteria: green reproducible CI, no known reachable critical vulnerabilities, documented supported runtimes, and approved ADRs/contracts.

## Phase 2 — Identity, tenancy, and durable persistence

1. Add Supabase Auth with server-validated sessions; do not trust client metadata for authorization.
2. Add Postgres schema/migrations with ownership columns and RLS on every exposed table. Keep authorization claims in controlled app metadata and test cross-tenant denial.
3. Make the server database the source of truth for projects, conversations, messages, revisions, model usage, and deployments.
4. Store large snapshots/assets in object storage with signed, owner-scoped access; use immutable revision manifests and checksums.
5. Implement migration/import from local IndexedDB with explicit user consent; retain offline/local mode only if product scope requires it.
6. Add autosave, optimistic concurrency/version checks, reconnect/resume, retention/deletion/export, and backup/restore policies.

Exit criteria: a signed-in user can create, save, reopen, edit, and delete only their own durable projects from another device.

## Phase 3 — Provider-neutral AI gateway

1. Introduce a product-owned `ModelGateway` interface: stable IDs, capabilities, context/output limits, streaming events, usage, normalized errors, and cancellation.
2. Upgrade Vercel AI SDK in a dedicated migration; implement OpenAI, Anthropic, Gemini, and OpenRouter adapters first, with contract tests and one generic future-provider fixture.
3. Move all provider credentials server-side. Support platform keys first; add encrypted bring-your-own-key only if required.
4. Replace model/provider text markers with typed request/session metadata.
5. Version prompts and artifact schemas; validate generated actions with Zod/JSON Schema and retain a compatibility parser during migration.
6. Add quotas, token/cost accounting, retry/idempotency, rate limits, model allowlists, safety policy, redacted traces, and provider failover policy.

Exit criteria: the same generation suite passes against all four primary providers and adding a provider does not change chat, persistence, or execution code.

## Phase 4 — Execution environment abstraction and isolation

1. Define `ExecutionEnvironment` for lifecycle, filesystem, process I/O, snapshots, ports/previews, Git, build outputs, and cancellation.
2. Wrap current WebContainer behavior in `WebContainerExecutionEnvironment` without changing UX.
3. Implement `RemoteSandboxExecutionEnvironment` for E2B or the selected service on the server; bind sandbox IDs to authenticated projects.
4. Stream process/file/port events to clients over authenticated SSE/WebSockets. Use signed preview URLs on an origin isolated from application cookies.
5. Add command policy, egress controls, resource/time limits, secret injection scopes, malware/package scanning, idle shutdown, cleanup, and complete audit logs.
6. Migrate file stores, terminal, search, Git, import/export, and deployment collection off direct `@webcontainer/api` calls.
7. Run both adapters behind a feature flag until parity, reliability, latency, and cost targets are met.

Exit criteria: prompt-to-preview works through either adapter; no UI or AI module imports vendor sandbox types; tenant isolation and cleanup are tested.

## Phase 5 — Git and publishing platform

1. Replace personal access token storage with a GitHub App/OAuth flow and installation-scoped permissions; add webhook verification and repository ownership mapping.
2. Build versioned commit/push/pull/conflict workflows tied to project revisions and background jobs.
3. Replace caller-supplied Vercel/Netlify tokens with approved OAuth/marketplace integrations or a controlled first-party publish service.
4. Make deployments asynchronous, idempotent jobs with logs, cancellation, retries, custom domains, rollback, and ownership checks.
5. Scan files/dependencies/licenses and generate an SBOM/third-party notice before publishing.

Exit criteria: users can safely connect repositories, publish, observe status, revisit a deployment, and roll back without exposing provider tokens.

## Phase 6 — Billing, usage, operations, and compliance

1. Add Stripe customers/subscriptions/entitlements and webhook idempotency; authorize entitlements server-side.
2. Meter model tokens/cost, sandbox time/resources, storage, bandwidth, and deployments. Enforce budgets before starting work.
3. Add structured logs, traces, error monitoring, product analytics with consent, correlation IDs, redaction, and SLO dashboards.
4. Implement abuse controls, incident response, key rotation, audit retention, privacy/export/deletion workflows, backups, disaster recovery, and dependency/SBOM automation.
5. Perform threat modeling and independent penetration testing before general availability.

Exit criteria: billing and quotas reconcile, operational alerts are actionable, and security/privacy launch criteria are signed off.

## Phase 7 — Product differentiation

Only after the platform is safe and durable: redesign/branding, collaboration, reusable components, domains, analytics, team features, marketplace/templates, and other new website-builder capabilities.

## Suggested first implementation slice

The next approved development phase should be Phase 1 only. Start with runtime/CI reproducibility and characterization tests, then dependency remediation and architecture decision records. Do not combine that work with UI redesign, authentication rollout, a framework migration, or an E2B migration; each needs a reviewable boundary and rollback path.
