# Repository Map

Audited revision: `2e254ac19a696394030601bc602f54945b12bfc4`

## Top level

| Path | Responsibility |
| --- | --- |
| `app/` | Remix application: UI, API routes, stores, persistence, LLM and runtime code |
| `functions/[[path]].ts` | Cloudflare Pages catch-all function importing the generated server build |
| `electron/` | Electron main/preload processes and desktop integration |
| `public/` | Static assets and the preview inspector script |
| `icons/`, `assets/` | Application/template and desktop package assets |
| `scripts/` | Cleanup, update, environment, and Electron development helpers |
| `.github/` | CI workflows, actions, issue templates, and repository automation |
| `docs/` | MkDocs documentation plus this audit set |
| `package.json` / `pnpm-lock.yaml` | Scripts, exact package-manager declaration, dependencies, lockfile |
| `vite.config.ts` | Remix/Vite, Cloudflare dev proxy, UnoCSS, polyfills, and Vitest configuration |
| `wrangler.toml` | Cloudflare Pages output, compatibility settings, telemetry disabled |
| `Dockerfile`, `docker-compose.yaml` | Containerized development/production paths |
| `electron-builder.yml`, `electron-update.yml` | Desktop packaging/update configuration |
| `.env.example`, `.env.production` | Documented provider and integration variables |
| `LICENSE` | MIT license and notice obligation |

## Entry points and routing

| Path | Responsibility |
| --- | --- |
| `app/root.tsx` | Document shell, global providers/styles, error boundary |
| `app/entry.client.tsx` | Browser hydration |
| `app/entry.server.tsx` | Remix server rendering |
| `app/routes/_index.tsx` | Main landing/chat page |
| `app/routes/chat.$id.tsx` | Chat/project URL route; reuses index UI |
| `app/routes/git.tsx` | Git import route |
| `app/routes/api.chat.ts` | Main streamed AI backend |
| `app/routes/api.llmcall.ts` | Auxiliary one-shot LLM call |
| `app/routes/api.enhancer.ts` | Prompt enhancement endpoint |
| `app/routes/api.models.ts`, `api.models.$provider.ts` | Provider/model discovery |
| `app/routes/api.configured-providers.ts` | Server-configured provider discovery |
| `app/routes/api.mcp-check.ts`, `api.mcp-update-config.ts` | MCP singleton configuration/health |
| `app/routes/api.supabase*.ts` | Supabase Management API and SQL proxy operations |
| `app/routes/api.vercel-deploy.ts`, `api.netlify-deploy.ts` | Generated-project deployment proxies |
| `app/routes/api.git-*`, `api.github-*`, `api.gitlab-*` | Git and hosted-repository integration APIs |
| `app/routes/api.web-search.ts` | Search/fetch proxy used as chat context |
| `app/routes/webcontainer.connect.$id.tsx` | WebContainer connect/bootstrap page |
| `app/routes/webcontainer.preview.$id.tsx` | Preview route |

## Chat and prompt UI

| Path | Responsibility |
| --- | --- |
| `app/components/chat/Chat.client.tsx` | Main chat controller; `useChat`, prompt send/reload/abort, model/provider state, attachments, persistence |
| `app/components/chat/BaseChat.tsx` | Overall chat/workbench layout |
| `app/components/chat/ChatBox.tsx` | Prompt textarea/composer and integration controls |
| `app/components/chat/ModelSelector.tsx` | Model/provider selection UI |
| `app/components/chat/Messages.client.tsx` | Message list and history |
| `AssistantMessage.tsx`, `UserMessage.tsx`, `Markdown.tsx` | Message rendering and sanitized Markdown |
| `Artifact.tsx` | Generated artifact/action presentation |
| `ToolInvocations.tsx`, `MCPTools.tsx` | MCP tool display, approval, and availability |
| `StarterTemplates.tsx`, `ExamplePrompts.tsx` | Initial project/template affordances |

## AI, prompts, and generation

| Path | Responsibility |
| --- | --- |
| `app/lib/.server/llm/stream-text.ts` | Provider/model resolution, system prompt assembly, AI SDK streaming |
| `app/lib/.server/llm/create-summary.ts` | Conversation summarization call |
| `app/lib/.server/llm/select-context.ts` | Model-assisted relevant-file selection |
| `app/lib/.server/llm/stream-recovery.ts`, `switchable-stream.ts` | Stream liveness, continuation, switching |
| `app/lib/.server/llm/constants.ts`, `utils.ts` | Token limits, file/context and marker helpers |
| `app/lib/modules/llm/base-provider.ts` | Common provider contract/config/key lookup |
| `app/lib/modules/llm/manager.ts` | Provider registration, lookup, model cache/discovery |
| `app/lib/modules/llm/registry.ts` | Explicit provider exports |
| `app/lib/modules/llm/providers/*.ts` | Vendor-specific AI SDK/model-list adapters |
| `app/lib/common/prompt-library.ts` | Prompt variant registry/parameter injection |
| `app/lib/common/prompts/prompts.ts` | Default system prompt entry point |
| `app/lib/common/prompts/new-prompt.ts` | Primary build/code-generation instructions |
| `app/lib/common/prompts/optimized.ts` | Context-optimized prompt variant |
| `app/lib/common/prompts/discuss-prompt.ts` | Non-building discussion prompt |
| `app/lib/runtime/message-parser.ts` | Incremental `<boltArtifact>/<boltAction>` parser |
| `app/lib/runtime/enhanced-message-parser.ts` | Code-fence/action enhancement layer |
| `app/lib/hooks/useMessageParser.ts` | Connects parsed actions to workbench callbacks |

## Workbench, files, execution, and preview

| Path | Responsibility |
| --- | --- |
| `app/lib/webcontainer/index.ts` | Exact WebContainer boot site, inspector installation, preview errors |
| `app/lib/stores/workbench.ts` | Central artifact/action queue and facade for editor/files/terminal/previews |
| `app/lib/runtime/action-runner.ts` | Executes parsed file/shell/start/Supabase/deploy actions |
| `app/lib/stores/files.ts` | WebContainer filesystem watch/read/write/delete and file state |
| `app/lib/stores/editor.ts` | Open documents, current file, edit state |
| `app/lib/stores/terminal.ts` | WebContainer shell process lifecycle |
| `app/utils/shell.ts` | `/bin/jsh` process, I/O, command execution and output parsing |
| `app/lib/stores/previews.ts` | Port/server events, preview list, cross-tab refresh |
| `app/components/workbench/Workbench.client.tsx` | Code/diff/preview tabs and panels |
| `app/components/workbench/EditorPanel.tsx`, `FileTree.tsx` | Editor and project navigation |
| `app/components/editor/codemirror/*` | CodeMirror configuration, languages, binary/env handling |
| `app/components/workbench/terminal/*` | xterm terminal view, manager, tabs, theme |
| `app/components/workbench/Preview.tsx` | Live iframe preview and navigation controls |
| `app/components/workbench/Inspector*.tsx` | Preview element selection/inspection |
| `public/inspector-script.js` | Script injected into generated preview pages |

## Project creation and persistence

| Path | Responsibility |
| --- | --- |
| `app/utils/selectStarterTemplate.ts` | Chooses/fetches starter templates for new projects |
| `app/components/chat/StarterTemplates.tsx` | User-facing template choice |
| `app/components/chat/ImportFolderButton.tsx`, `GitCloneButton.tsx` | Folder/Git-based project creation |
| `app/lib/persistence/db.ts` | IndexedDB schema and chat/snapshot CRUD |
| `app/lib/persistence/useChatHistory.ts` | Creates/saves/loads chats and WebContainer snapshots |
| `app/lib/persistence/chats.ts` | Additional chat CRUD helpers |
| `app/lib/persistence/localStorage.ts` | Browser localStorage helpers |
| `app/lib/services/importExportService.ts` | Import/export orchestration |
| `app/lib/stores/settings.ts` | Provider and feature settings persisted locally |

## Git and deployments

| Path | Responsibility |
| --- | --- |
| `app/lib/hooks/useGit.ts` | isomorphic-git adapter over WebContainer FS |
| `app/lib/services/githubApiService.ts`, `gitlabApiService.ts` | Repository host API clients |
| `app/lib/stores/github*.ts`, `gitlabConnection.ts` | Browser connection state/tokens |
| `app/components/deploy/DeployButton.tsx` | Deployment entry point |
| `app/components/deploy/VercelDeploy.client.tsx` | Build/file collection and Vercel request |
| `app/components/deploy/NetlifyDeploy.client.tsx` | Build/file collection and Netlify request |
| `app/components/deploy/GitHubDeploy.client.tsx`, `GitLabDeploy.client.tsx` | Hosted Git push/deploy flows |
| `app/components/deploy/*DeploymentDialog.tsx` | Repository/deployment configuration UI |

## Settings, integrations, and operations

| Path | Responsibility |
| --- | --- |
| `app/components/@settings/core/ControlPanel.tsx` | Settings navigation and tab composition |
| `app/components/@settings/tabs/providers/*` | Cloud/local provider configuration |
| `app/components/@settings/tabs/github`, `gitlab`, `netlify`, `vercel`, `supabase` | Integration settings |
| `app/components/@settings/tabs/mcp/*` | MCP JSON configuration/status UI |
| `app/lib/services/mcpService.ts` | MCP clients, tool registration, approval-result execution |
| `app/lib/stores/mcp.ts` | Zustand MCP settings/UI state |
| `app/lib/stores/supabase.ts`, `useSupabaseConnection.ts` | Supabase management connection state |
| `app/lib/stores/logs.ts`, `app/utils/logger.ts` | In-memory/console logs |
| `app/lib/security.ts`, `app/lib/crypto.ts` | Security/crypto helpers; not a complete SaaS security boundary |

## Configuration ownership

- Runtime/build environment: `.env.example`, `.env.production`, `vite.config.ts`, `wrangler.toml`, `pre-start.cjs`, `bindings.sh`.
- Application constants/default provider: `app/utils/constants.ts`.
- User settings: `app/lib/stores/settings.ts` and `app/components/@settings/**`.
- TypeScript/lint/style: `tsconfig.json`, `eslint.config.mjs`, `uno.config.ts`, `.editorconfig`.
- Tests: `vite.config.ts`, `playwright.config.preview.ts`, and the three `*.spec.ts` files.
