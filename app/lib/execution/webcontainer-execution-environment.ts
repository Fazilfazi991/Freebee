import type { FileSystemTree, WebContainer, WebContainerProcess } from '@webcontainer/api';
import type {
  CommandExecutionHook,
  ExecutionCommand,
  ExecutionEnvironment,
  ExecutionFileEntry,
  ExecutionProcess,
  ExecutionResult,
  FileSystemEvent,
  PreviewEvent,
} from './types';

function adaptProcess(process: WebContainerProcess): ExecutionProcess {
  return {
    output: process.output,
    exit: process.exit,
    async write(data) {
      const writer = process.input.getWriter();

      try {
        await writer.write(data);
      } finally {
        writer.releaseLock();
      }
    },
    resize: (dimensions) => process.resize(dimensions),
    terminate: () => process.kill(),
  };
}

export class WebContainerExecutionEnvironment implements ExecutionEnvironment {
  readonly kind = 'webcontainer' as const;
  #commandHook?: CommandExecutionHook;
  #previewUrls = new Map<number, string>();

  constructor(private readonly _container: WebContainer) {
    _container.on('port', (port, type, url) => {
      if (type === 'open') {
        this.#previewUrls.set(port, url);
      } else {
        this.#previewUrls.delete(port);
      }
    });
  }

  get workdir() {
    return this._container.workdir;
  }

  bindCommandExecution(hook: CommandExecutionHook) {
    this.#commandHook = hook;
  }

  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  readFile(path: string): Promise<Uint8Array>;
  readFile(path: string, encoding?: 'utf-8') {
    return encoding === 'utf-8' ? this._container.fs.readFile(path, 'utf-8') : this._container.fs.readFile(path);
  }

  writeFile(path: string, content: string | Uint8Array) {
    return this._container.fs.writeFile(path, content);
  }

  async createDirectory(path: string, options?: { recursive?: boolean }) {
    if (options?.recursive) {
      await this._container.fs.mkdir(path, { recursive: true });
    } else {
      await this._container.fs.mkdir(path);
    }
  }

  async deletePath(path: string, options?: { recursive?: boolean }) {
    if (options?.recursive) {
      await this._container.fs.rm(path, { recursive: true });
    } else {
      await this._container.fs.rm(path);
    }
  }

  async renamePath(from: string, to: string) {
    await this._container.fs.rename(from, to);
  }

  async listFiles(path: string): Promise<ExecutionFileEntry[]> {
    const entries = await this._container.fs.readdir(path, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, isFile: entry.isFile(), isDirectory: entry.isDirectory() }));
  }

  async runCommand(request: ExecutionCommand): Promise<ExecutionResult> {
    if (this.#commandHook) {
      return this.#commandHook(request);
    }

    const process = await this._container.spawn('/bin/jsh', ['-c', request.command], {
      cwd: request.workingDirectory,
    });
    let output = '';
    await Promise.all([
      process.output.pipeTo(
        new WritableStream({
          write(chunk) {
            output += chunk;
          },
        }),
      ),
      process.exit,
    ]);

    return { exitCode: await process.exit, output };
  }

  async spawnProcess(command: string, args: string[], options?: { cwd?: string }) {
    return adaptProcess(await this._container.spawn(command, args, options));
  }

  onPreview(listener: (event: PreviewEvent) => void) {
    return this._container.on('port', (port, type, url) => listener({ port, type, url }));
  }

  onFileSystemChange(listener: (events: FileSystemEvent[]) => void) {
    return this._container.internal.watchPaths({ include: ['/**'], exclude: ['/node_modules', '/.git'] }, (events) =>
      listener(events as FileSystemEvent[]),
    );
  }

  getPreviewUrl(port: number) {
    return this.#previewUrls.get(port);
  }

  async mount(files: FileSystemTree) {
    await this._container.mount(files);
  }
}
