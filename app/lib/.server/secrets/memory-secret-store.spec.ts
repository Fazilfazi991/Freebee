import { describe, expect, it } from 'vitest';
import { MemorySecretStore } from './memory-secret-store';

describe('MemorySecretStore', () => {
  it('returns metadata without returning raw secret values', async () => {
    const store = new MemorySecretStore();
    await store.storeSecret('session-1', 'provider:OpenAI', 'sk-sensitive');

    const metadata = await store.listSecretMetadata('session-1');
    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toMatchObject({ name: 'provider:OpenAI' });
    expect(metadata[0]).not.toHaveProperty('value');
    expect(JSON.stringify(metadata)).not.toContain('sk-sensitive');
  });

  it('isolates scopes and deletes values', async () => {
    const store = new MemorySecretStore();
    await store.storeSecret('session-1', 'provider:OpenAI', 'first');
    await store.storeSecret('session-2', 'provider:OpenAI', 'second');
    expect(await store.getSecret('session-1', 'provider:OpenAI')).toBe('first');
    await store.deleteSecret('session-1', 'provider:OpenAI');
    expect(await store.getSecret('session-1', 'provider:OpenAI')).toBeUndefined();
    expect(await store.getSecret('session-2', 'provider:OpenAI')).toBe('second');
  });
});
