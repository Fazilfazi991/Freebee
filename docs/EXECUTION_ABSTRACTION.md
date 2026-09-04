# Execution abstraction boundary

## Phase 1B result

Generated `<boltArtifact>` / `<boltAction>` output is still parsed exactly as before, but file and generated-command execution now crosses a provider-neutral boundary:

- `app/lib/execution/types.ts` defines filesystem, process, command, preview, and change-event contracts.
- `app/lib/execution/policy.ts` normalizes command metadata and rejects empty, oversized, null-byte, and workspace-escaping requests.
- `app/lib/execution/execution-service.ts` is the policy/enforcement seam used by the action runner.
- `app/lib/execution/webcontainer-execution-environment.ts` is the WebContainer adapter.
- `app/lib/webcontainer/index.ts` remains the browser boot/composition root and injects the adapter into `WorkbenchStore`.
- `app/lib/runtime/action-runner.ts` no longer imports `@webcontainer/api`; generated file and shell/start actions use the abstraction.

The adapter binds generated commands to the existing persistent `BoltShell`, retaining command session and abort behavior. Its direct-spawn fallback exists for environments without that UI shell.

## Current contract

`ExecutionEnvironment` exposes workspace identity, read/write/create/delete/rename/list operations, normalized command execution, process spawning, preview events/URLs, and filesystem-change events. `ExecutionService` constrains paths to the project root, creates parent directories, rejects unknown action types, emits trace metadata, and propagates execution failures.

## Deliberately incomplete migration inventory

Direct WebContainer dependencies remain in the browser bootstrap/auth/connect route and in `files.ts`, `previews.ts`, `terminal.ts`, `useGit.ts`, `Search.tsx`, and `utils/shell.ts`. This is intentional incremental migration, not a claim that WebContainers have been removed. `ActionRunner` is the first high-risk generated-code path moved behind the boundary.

## Remote sandbox compatibility

E2B or another remote sandbox can implement the contract, but replacement is not a package swap. A production adapter and coordinator must add:

1. server-owned sandbox provisioning and tenant authorization;
2. durable project hydration and write-through snapshot synchronization;
3. bidirectional terminal streaming and explicit cancellation/timeouts;
4. signed preview URLs and port lifecycle routing;
5. quotas, egress policy, audit logs, sleep/resume, and disposal;
6. capability negotiation for platform differences;
7. migration of the remaining direct WebContainer consumers to provider-neutral events.

WebContainers remain appropriate for fast local previews. For a commercial multi-tenant service, a remote isolated sandbox should become the default execution trust boundary while the browser adapter can remain an optional local mode.
