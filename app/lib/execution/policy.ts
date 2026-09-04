import type { ExecutionCommand } from './types';

export class ExecutionPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionPolicyError';
  }
}

export function normalizeExecutionCommand(input: {
  command: string;
  workingDirectory?: string;
  sourceId?: string;
  traceId?: string;
  onAbort?: () => void;
}): ExecutionCommand {
  const command = input.command.trim();

  if (!command) {
    throw new ExecutionPolicyError('Command must not be empty');
  }

  if (command.includes('\0')) {
    throw new ExecutionPolicyError('Command must not contain null bytes');
  }

  if (command.length > 100_000) {
    throw new ExecutionPolicyError('Command exceeds the execution boundary limit');
  }

  const workingDirectory = input.workingDirectory?.replace(/\\/g, '/');

  if (workingDirectory?.split('/').includes('..')) {
    throw new ExecutionPolicyError('Working directory must remain inside the project workspace');
  }

  return {
    command,
    workingDirectory,
    sourceId: input.sourceId,
    traceId: input.traceId ?? crypto.randomUUID(),
    requestedAt: new Date().toISOString(),
    onAbort: input.onAbort,
  };
}
