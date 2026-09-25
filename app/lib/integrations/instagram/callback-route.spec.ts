import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

const admin = { userId: 'd15155fb-a78d-4b1e-aa5f-99bfc6cceeb6', sessionId: 'test-session' };
const testConfig = {
  supabaseUrl: 'https://yzxhckeyktgxpflnrtne.supabase.co',
  publishableKey: 'test-publishable', secretKey: 'test-secret',
  encryptionKey: btoa(String.fromCharCode(...new Uint8Array(32).fill(5))),
  adminUserId: admin.userId,
  instagramAppId: '2262233491193074', instagramAppSecret: 'test-meta-secret',
  redirectUri: 'https://localhost:3000/api/integrations/instagram/callback',
  expectedAccountId: '17841426407668459', expectedUsername: 'millionvault.com_',
};

vi.mock('~/lib/integrations/instagram/config.server', () => ({ getInstagramConfig: () => testConfig }));
vi.mock('~/lib/integrations/instagram/admin-auth.server', () => ({
  requireAdmin: async () => admin,
  privateHeaders: () => new Headers({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }),
}));

import { loader } from '~/routes/api.integrations.instagram.callback';
import { randomUrlSafe } from '~/lib/integrations/instagram/crypto.server';

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function args(state: string, code?: string): LoaderFunctionArgs {
  const url = new URL('https://localhost:3000/api/integrations/instagram/callback');
  url.searchParams.set('state', state);
  if (code) url.searchParams.set('code', code);
  return { request: new Request(url), context: {}, params: {} } as LoaderFunctionArgs;
}

describe('Instagram OAuth callback route', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('redirects without a code after consuming state', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response([{ state_hash: 'consumed' }]));
    const result = await loader(args(randomUrlSafe()));
    expect(result.headers.get('Location')).toBe('/dashboard/integrations/instagram?error=missing_code');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns only a safe error code when Meta token exchange fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response([{ state_hash: 'consumed' }]))
      .mockResolvedValueOnce(response({ error_message: 'sensitive upstream detail' }, 400));
    const result = await loader(args(randomUrlSafe(), 'one-time-code'));
    expect(result.headers.get('Location')).toBe('/dashboard/integrations/instagram?error=token_exchange_failed');
    expect(result.headers.get('Location')).not.toContain('sensitive upstream detail');
  });

  it('redirects successfully without putting credentials in the URL or body', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response([{ state_hash: 'consumed' }]))
      .mockResolvedValueOnce(response({ data: [{ access_token: 'short-test-token', permissions: 'instagram_business_basic,instagram_business_content_publish' }] }))
      .mockResolvedValueOnce(response({ access_token: 'long-test-token', expires_in: 5183944 }))
      .mockResolvedValueOnce(response({ data: [{ user_id: testConfig.expectedAccountId, username: testConfig.expectedUsername, account_type: 'Business' }] }))
      .mockResolvedValueOnce(new Response('', { status: 201 }));
    const result = await loader(args(randomUrlSafe(), 'one-time-code'));
    expect(result.headers.get('Location')).toBe('/dashboard/integrations/instagram?connected=1');
    expect(result.headers.get('Location')).not.toContain('token');
    expect(await result.text()).not.toContain('long-test-token');
  });
});
