import { createScopedLogger } from '~/utils/logger';
import { normalizeExecutionCommand } from './policy';
import type { ExecutionEnvironment, ExecutionResult } from './types';

const logger = createScopedLogger('ExecutionService');

export class UnsupportedExecutionActionError extends Error {
  constructor(actionType: string) {
    super(`Unsupported execution action: ${actionType}`);
    this.name = 'UnsupportedExecutionActionError';
  }
}

export class ExecutionService {
  constructor(private readonly _environment: ExecutionEnvironment) {}

  async writeFile(path: string, content: string | Uint8Array) {
    const relativePath = this._toWorkspacePath(path);
    const directory = relativePath.includes('/') ? relativePath.slice(0, relativePath.lastIndexOf('/')) : '';

    if (directory) {
      await this._environment.createDirectory(directory, { recursive: true });
    }

    await this._environment.writeFile(relativePath, content);
  }

  async deleteFile(path: string) {
    await this._environment.deletePath(this._toWorkspacePath(path));
  }

  async executeAction(
    action:
      | { type: 'file'; filePath: string; content: string | Uint8Array }
      | { type: 'delete'; filePath: string }
      | {
          type: 'shell';
          command: string;
          workingDirectory?: string;
          sourceId?: string;
          traceId?: string;
          onAbort?: () => void;
        },
  ) {
    switch (action.type) {
      case 'file':
        return this.writeFile(action.filePath, action.content);
      case 'delete':
        return this.deleteFile(action.filePath);
      case 'shell':
        return this.runCommand(action);
      default:
        throw new UnsupportedExecutionActionError((action as { type: string }).type);
    }
  }

  async runCommand(input: {
    command: string;
    workingDirectory?: string;
    sourceId?: string;
    traceId?: string;
    onAbort?: () => void;
  }): Promise<ExecutionResult> {
    const request = normalizeExecutionCommand(input);
    logger.info('Executing generated command', {
      environment: this._environment.kind,
      traceId: request.traceId,
      sourceId: request.sourceId,
      workingDirectory: request.workingDirectory,
    });

    try {
      const result = await this._environment.runCommand(request);
      logger.info('Generated command completed', { traceId: request.traceId, exitCode: result.exitCode });

      return result;
    } catch (error) {
      logger.error('Generated command failed', { traceId: request.traceId, error });
      throw error;
    }
  }

  assertSupportedAction(actionType: string) {
    if (!['file', 'shell', 'start', 'build'].includes(actionType)) {
      throw new UnsupportedExecutionActionError(actionType);
    }
  }

  private _toWorkspacePath(path: string) {
    const normalized = path.replace(/\\/g, '/');
    const workdir = this._environment.workdir.replace(/\\/g, '/').replace(/\/$/, '');
    const relative = normalized.startsWith(`${workdir}/`)
      ? normalized.slice(workdir.length + 1)
      : normalized.replace(/^\/+/, '');

    if (!relative || relative.split('/').includes('..')) {
      throw new Error(`Path escapes or does not identify a file in the workspace: ${path}`);
    }

    return relative;
  }
}
