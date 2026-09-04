import { describe, expect, it, vi } from 'vitest';
import { WebContainerExecutionEnvironment } from './webcontainer-execution-environment';

describe('WebContainerExecutionEnvironment lifecycle contract', () => {
  it('tracks preview URLs from provider port events', () => {
    let listener: ((port: number, type: 'open' | 'close', url: string) => void) | undefined;
    const container = {
      workdir: '/workspace',
      on: vi.fn((_event: string, callback: typeof listener) => {
        listener = callback;
        return () => undefined;
      }),
    };
    const environment = new WebContainerExecutionEnvironment(container as never);
    listener?.(5173, 'open', 'https://preview.example');
    expect(environment.getPreviewUrl(5173)).toBe('https://preview.example');
    listener?.(5173, 'close', 'https://preview.example');
    expect(environment.getPreviewUrl(5173)).toBeUndefined();
  });

  it('exposes process output, exit, resize, and termination', async () => {
    const resize = vi.fn();
    const kill = vi.fn();
    const container = {
      workdir: '/workspace',
      on: vi.fn(() => () => undefined),
      spawn: vi.fn(async () => ({
        output: new ReadableStream<string>(),
        exit: Promise.resolve(0),
        input: new WritableStream<string>(),
        resize,
        kill,
      })),
    };
    const process = await new WebContainerExecutionEnvironment(container as never).spawnProcess('node', ['app.js']);
    process.resize({ cols: 80, rows: 24 });
    process.terminate();
    expect(await process.exit).toBe(0);
    expect(resize).toHaveBeenCalledWith({ cols: 80, rows: 24 });
    expect(kill).toHaveBeenCalledOnce();
  });
});
