export type ExecutionEnvironmentKind = 'webcontainer' | 'remote-sandbox';

export interface ExecutionCommand {
  command: string;
  workingDirectory?: string;
  sourceId?: string;
  traceId: string;
  requestedAt: string;
  onAbort?: () => void;
}

export interface ExecutionResult {
  exitCode: number;
  output: string;
}

export interface ExecutionProcess {
  readonly output: ReadableStream<string>;
  readonly exit: Promise<number>;
  write(data: string): Promise<void>;
  resize(dimensions: { cols: number; rows: number }): void;
  terminate(): void;
}

export interface ExecutionFileEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}

export type FileSystemEvent = { type: 'add_file' | 'remove_file' | 'change' | 'add_dir' | 'remove_dir'; path: string };
export type PreviewEvent = { port: number; type: 'open' | 'close'; url: string };

export interface ExecutionEnvironment {
  readonly kind: ExecutionEnvironmentKind;
  readonly workdir: string;
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, content: string | Uint8Array): Promise<void>;
  createDirectory(path: string, options?: { recursive?: boolean }): Promise<void>;
  deletePath(path: string, options?: { recursive?: boolean }): Promise<void>;
  renamePath(from: string, to: string): Promise<void>;
  listFiles(path: string): Promise<ExecutionFileEntry[]>;
  runCommand(request: ExecutionCommand): Promise<ExecutionResult>;
  spawnProcess(command: string, args: string[], options?: { cwd?: string }): Promise<ExecutionProcess>;
  onPreview(listener: (event: PreviewEvent) => void): () => void;
  onFileSystemChange(listener: (events: FileSystemEvent[]) => void): () => void;
  getPreviewUrl(port: number): string | undefined;
  bindCommandExecution?(hook: CommandExecutionHook): void;
}

export type CommandExecutionHook = (request: ExecutionCommand) => Promise<ExecutionResult>;
