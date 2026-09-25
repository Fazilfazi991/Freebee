import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const config = {
  expectedAccountId: '17841426407668459', expectedUsername: 'millionvault.com_', encryptionKey: 'test-key',
} as never;
const row = {
  instagram_user_id: '17841426407668459', username: 'millionvault.com_', status: 'connected',
  scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
  access_token_encrypted: 'encrypted-test', token_expires_at: '2099-01-01T00:00:00Z',
};

vi.mock('./supabase.server', () => ({
  IntegrationFailure: class IntegrationFailure extends Error { constructor(public code: string) { super(code); } },
  getEncryptedConnection: vi.fn(),
}));
vi.mock('./crypto.server', () => ({ decryptSecret: vi.fn(async () => 'test-token') }));

import { getEncryptedConnection } from './supabase.server';
import { createReelContainer, getPublishingUsage, getReelContainerStatus, publishReelContainer } from './reel-meta.server';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('Instagram Login Reel API', () => {
  beforeEach(() => {
    vi.mocked(getEncryptedConnection).mockResolvedValue(row as never);
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

  it('rejects disconnected, incorrect, and missing-credential connections', async () => {
    for (const [change, code] of [
      [{ status: 'disconnected' }, 'account_disconnected'],
      [{ instagram_user_id: '123' }, 'unexpected_account'],
      [{ access_token_encrypted: null }, 'missing_credential'],
      [{ token_expires_at: '2000-01-01T00:00:00Z' }, 'token_expired'],
    ] as const) {
      vi.mocked(getEncryptedConnection).mockResolvedValueOnce({ ...row, ...change } as never);
      await expect(createReelContainer(config, 'admin', 'https://video.example/reel.mp4', 'test')).rejects.toMatchObject({ code });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates a REELS container with no credential in URL or payload', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ id: '17911111111111111' }));
    expect(await createReelContainer(config, 'admin', 'https://video.example/reel.mp4', 'Test')).toBe('17911111111111111');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe('https://graph.instagram.com/v26.0/17841426407668459/media');
    expect(String(url)).not.toContain('test-token');
    expect(String(init?.body)).not.toContain('test-token');
    expect(JSON.parse(String(init?.body))).toMatchObject({ media_type: 'REELS', share_to_feed: false });
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it.each(['IN_PROGRESS', 'FINISHED', 'ERROR', 'EXPIRED', 'PUBLISHED'])('reads %s processing status', async (status) => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ status_code: status }));
    expect(await getReelContainerStatus(config, 'admin', '17911111111111111')).toBe(status);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('fields=status_code');
  });

  it('publishes using the container ID and returns only the media ID', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ id: '18022222222222222' }));
    expect(await publishReelContainer(config, 'admin', '17911111111111111')).toBe('18022222222222222');
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/media_publish');
    expect(JSON.parse(String(init?.body))).toEqual({ creation_id: '17911111111111111' });
  });

  it('reads the account publishing allowance using Instagram Login', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ data: [{ quota_usage: 2, config: { quota_total: 50 } }] }));
    expect(await getPublishingUsage(config, 'admin')).toEqual({ used: 2, total: 50 });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/content_publishing_limit?fields=quota_usage%2Cconfig');
  });

  it.each([[400, 'publish_rejected'], [500, 'publish_server_error'], [429, 'meta_rate_limited']])('sanitizes a Meta %i error', async (status, code) => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ error: { message: 'secret test-token' } }, status));
    await expect(publishReelContainer(config, 'admin', '17911111111111111')).rejects.toMatchObject({ code });
  });

  it('handles a network timeout without exposing the token', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('request with test-token failed'));
    await expect(createReelContainer(config, 'admin', 'https://video.example/reel.mp4', 'Test')).rejects.toMatchObject({ code: 'container_create_timeout' });
  });
});
