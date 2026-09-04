# Commercial project model

This is a conceptual contract for Phase 1A, not a database schema. Every tenant-owned record must carry a `workspace_id`; user-facing project data additionally carries `project_id` where applicable. Authorization is checked server-side on every read and write, with row-level security as defense in depth when Postgres/Supabase is adopted.

| Entity | Purpose and minimum relationships |
|---|---|
| User | Human identity from the auth provider; belongs to workspaces through membership, never owns shared data solely by email. |
| Workspace | Tenant and billing/security boundary; owns projects, integrations, secret references, and usage. |
| Project | Durable website identity; belongs to one workspace, has conversations, files, generations, deployments, and a current revision. |
| Conversation | Ordered editing dialogue for one project; belongs to the same workspace/project. |
| Message | Immutable user/assistant/tool event in a conversation with role, parts, sequence, status, and generation reference. |
| ProjectFile | Current logical path/content metadata for a project revision; content may be object-stored, versioned, and content-addressed. |
| Generation | One model invocation with provider/model, prompt/version references, status, token/cost metadata, and produced change set. |
| Deployment | Publish attempt for a project revision with provider, external ID, state, logs reference, URL, and timestamps. |
| Integration | Workspace-scoped connection metadata for GitHub, Vercel, Supabase, or another service; contains no plaintext secret. |
| SecretReference | Opaque pointer to encrypted/vaulted secret material, scoped to workspace, integration, environment, and permitted purpose. |
| UsageRecord | Append-only metering event tied to workspace and optionally project/user/generation; includes idempotency key and billable dimensions. |

## Invariants

- IDs are opaque and globally unique; parent scope is never accepted from the client without authorization.
- A project revision is immutable. Saving creates a new revision and atomically advances the current pointer.
- Messages and generations are append-only except for explicit status transitions and redaction metadata.
- File paths are normalized, relative, unique per revision, and cannot escape the project root.
- Deployments identify the exact immutable revision published.
- Secrets are never embedded in project files, messages, logs, usage records, or deployment metadata.
- Deletes use a documented retention/tombstone policy; audit events survive normal content deletion where legally appropriate.
- Usage insertion is idempotent and records provider request IDs where safe.

## Supabase/Postgres fit

Supabase Auth may supply `User`; Postgres tables and RLS can enforce workspace membership and project scope; Storage can hold larger snapshots/artifacts. Service-role credentials remain server-only. Schema, policies, retention, and encryption design belong to a later implementation phase.
