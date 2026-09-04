# Execution abstraction boundary

## Purpose

Today, generated projects execute in a browser-side StackBlitz WebContainer. A commercial product needs an execution contract that can retain WebContainers for local/instant previews while allowing E2B or another remote isolated sandbox without leaking vendor APIs into chat, persistence, or UI code.

## Current coupling

`app/lib/webcontainer/index.ts` creates the singleton WebContainer. `workbench.ts`, `files.ts`, `terminal.ts`, `previews.ts`, `action-runner.ts`, import/export helpers, and preview/terminal components consume WebContainer types or events directly. Project state is therefore the running container filesystem rather than a durable, provider-neutral snapshot.

## Proposed contract

```ts
interface ExecutionEnvironment {
  readonly id: string;
  boot(options: BootOptions): Promise<void>;
  mount(snapshot: ProjectSnapshot): Promise<void>;
  readFile(path: ProjectPath): Promise<Uint8Array>;
  writeFile(path: ProjectPath, contents: Uint8Array): Promise<void>;
  remove(path: ProjectPath, options?: { recursive?: boolean }): Promise<void>;
  list(path: ProjectPath): Promise<FileEntry[]>;
  spawn(command: string, args: string[], options?: SpawnOptions): Promise<ProcessHandle>;
  ports(): AsyncIterable<PortEvent>;
  snapshot(): Promise<ProjectSnapshot>;
  dispose(): Promise<void>;
}
```

Supporting interfaces should expose process stdout/stderr/exit separately, normalized port-ready events, cancellation, quotas, timeouts, and structured errors. Paths must be normalized and constrained to a workspace root. No adapter receives provider secrets it does not need.

## Adapters and ownership

- `WebContainerExecutionEnvironment`: wraps current `WebContainer.boot`, `fs`, `spawn`, and `server-ready` behavior.
- `RemoteSandboxExecutionEnvironment`: maps the same contract to E2B or a future service, with server-owned credentials and signed preview URLs.
- `ExecutionCoordinator`: owns lifecycle, health, cancellation, resource limits, snapshots, and adapter selection.
- UI stores consume only the coordinator's provider-neutral events.
- Durable `ProjectFile` records/snapshots are canonical; a sandbox is disposable derived state.

## Migration sequence

1. Add interfaces and an adapter around current WebContainer behavior without changing UI behavior.
2. Remove direct WebContainer imports from stores/components, replacing them with the coordinator.
3. Introduce durable snapshot hydration and write-through change events.
4. Add a remote adapter behind a server-side feature flag.
5. Add capability negotiation for network, processes, preview URLs, persistence, and sleep/resume.
6. Validate identical artifact actions against both adapters before changing the default.

Remote replacement is feasible, but not a package swap. Preview URL routing, terminal streaming, file synchronization, lifecycle, auth, quotas, and secret custody all move from browser-local implicit behavior to explicit server-managed services.
