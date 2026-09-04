import { describe, expect, it, vi } from 'vitest';
import { ExecutionService, UnsupportedExecutionActionError } from './execution-service';
import type {
  ExecutionCommand,
  ExecutionEnvironment,
  ExecutionFileEntry,
  ExecutionProcess,
  ExecutionResult,
} from './types';

class FakeExecutionEnvironment implements ExecutionEnvironment {
  readonly kind = 'webcontainer' as const;
  readonly workdir = '/workspace';
  files = new Map<string, string | Uint8Array>();
  commandResult: ExecutionResult = { exitCode: 0, output: 'ok' };
  commandError?: Error;

  async readFile(path: string, encoding: 'utf-8'): Promise<string>;
  async readFile(path: string): Promise<Uint8Array>;
  async readFile(path: string, encoding?: 'utf-8') {
    const value = this.files.get(path);

    if (value === undefined) {
      throw new Error('ENOENT');
    }

    if (encoding) {
      return typeof value === 'string' ? value : new TextDecoder().decode(value);
    }

    return typeof value === 'string' ? new TextEncoder().encode(value) : value;
  }
  async writeFile(path: string, content: string | Uint8Array) {
    this.files.set(path, content);
  }
  async createDirectory() {
    return undefined;
  }
  async deletePath(path: string) {
    this.files.delete(path);
  }
  async renamePath(from: string, to: string) {
    const value = this.files.get(from);

    if (value === undefined) {
      throw new Error('ENOENT');
    }

    this.files.set(to, value);
    this.files.delete(from);
  }
  async listFiles(): Promise<ExecutionFileEntry[]> {
    return [];
  }
  async runCommand(_request: ExecutionCommand) {
    if (this.commandError) {
      throw this.commandError;
    }

    return this.commandResult;
  }
  async spawnProcess(): Promise<ExecutionProcess> {
    throw new Error('not used');
  }
  onPreview() {
    return () => undefined;
  }
  onFileSystemChange() {
    return () => undefined;
  }
  getPreviewUrl() {
    return undefined;
  }
}

describe('ExecutionService', () => {
  it('creates and modifies a file through the environment', async () => {
    const environment = new FakeExecutionEnvironment();
    const service = new ExecutionService(environment);
    await service.executeAction({ type: 'file', filePath: '/workspace/src/app.ts', content: 'first' });
    await service.executeAction({ type: 'file', filePath: '/workspace/src/app.ts', content: 'second' });
    expect(environment.files.get('src/app.ts')).toBe('second');
  });

  it('deletes a file through the environment', async () => {
    const environment = new FakeExecutionEnvironment();
    environment.files.set('old.ts', 'old');
    await new ExecutionService(environment).executeAction({ type: 'delete', filePath: 'old.ts' });
    expect(environment.files.has('old.ts')).toBe(false);
  });

  it('normalizes and runs a generated command', async () => {
    const environment = new FakeExecutionEnvironment();
    const runCommand = vi.spyOn(environment, 'runCommand');
    await new ExecutionService(environment).executeAction({
      type: 'shell',
      command: '  pnpm test  ',
      sourceId: 'generation-1',
      traceId: 'trace-1',
    });
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'pnpm test', sourceId: 'generation-1', traceId: 'trace-1' }),
    );
  });

  it('propagates execution failures', async () => {
    const environment = new FakeExecutionEnvironment();
    environment.commandError = new Error('sandbox unavailable');
    await expect(
      new ExecutionService(environment).runCommand({ command: 'pnpm test', traceId: 'trace-2' }),
    ).rejects.toThrow('sandbox unavailable');
  });

  it('rejects unsupported normalized actions', async () => {
    const service = new ExecutionService(new FakeExecutionEnvironment());
    await expect(service.executeAction({ type: 'network' } as never)).rejects.toBeInstanceOf(
      UnsupportedExecutionActionError,
    );
  });
});
