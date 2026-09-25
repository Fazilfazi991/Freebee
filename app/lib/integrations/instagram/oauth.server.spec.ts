import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { requireAdmin } from './admin-auth.server';
import { decryptSecret, randomUrlSafe } from './crypto.server';
import { beginInstagramAuthorization, finishInstagramAuthorization, INSTAGRAM_SCOPES, validateAndConsumeState } from './oauth.server';
import { getConnection, IntegrationFailure } from './supabase.server';
import type { InstagramConfig } from './config.server';

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const config: InstagramConfig = {
  supabaseUrl: 'https://yzxhckeyktgxpflnrtne.supabase.co',
  publishableKey: 'test-publishable-key',
  secretKey: 'test-secret-key',
  encryptionKey: key,
  adminUserId: 'd15155fb-a78d-4b1e-aa5f-99bfc6cceeb6',
  instagramAppId: '2262233491193074',
  instagramAppSecret: 'test-instagram-secret',
  redirectUri: 'https://localhost:3000/api/integrations/instagram/callback',
  expectedAccountId: '17841426407668459',
  expectedUsername: 'millionvault.com_',
};
const admin = { userId: config.adminUserId, sessionId: 'test-admin-session' };

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('Instagram OAuth connection', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('generates unpredictable, distinct 256-bit state and asks for only the two required scopes', async () => {
    const fetchMock = vi.mocked(fetch).mockImplementation(async () => new Response('', { status: 201 }));
    const first = new URL(await beginInstagramAuthorization(config, admin));
    const second = new URL(await beginInstagramAuthorization(config, admin));
    expect(first.origin).toBe('https://www.instagram.com');
    expect(first.pathname).toBe('/oauth/authorize');
    expect(first.searchParams.get('client_id')).toBe(config.instagramAppId);
    expect(first.searchParams.get('scope')).toBe(INSTAGRAM_SCOPES.join(','));
    expect(first.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first.searchParams.get('state')).not.toBe(second.searchParams.get('state'));
    const stateRow = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { state_hash: string; session_hash: string; expires_at: string };
    expect(stateRow.state_hash).not.toBe(first.searchParams.get('state'));
    expect(stateRow.session_hash).not.toBe(admin.sessionId);
    expect(Date.parse(stateRow.expires_at)).toBeGreaterThan(Date.now());
  });

  it('rejects malformed state before contacting the database', async () => {
    const fetchMock = vi.mocked(fetch);
    await expect(validateAndConsumeState(config, admin, 'invalid')).rejects.toMatchObject({ code: 'invalid_state' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects expired or already consumed state', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(response([]));
    await expect(validateAndConsumeState(config, admin, randomUrlSafe())).rejects.toMatchObject({ code: 'invalid_state' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('consumed_at=is.null');
    expect(String(fetchMock.mock.calls[0][0])).toContain('expires_at=gt.');
    expect(String(fetchMock.mock.calls[0][0])).toContain('session_hash=eq.');
  });

  it('rejects a callback without an authorization code', async () => {
    await expect(finishInstagramAuthorization(config, admin, null)).rejects.toMatchObject({ code: 'missing_code' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles token-exchange failure without exposing Meta response text', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ error_message: 'sensitive upstream text' }, 400));
    await expect(finishInstagramAuthorization(config, admin, 'sample-code')).rejects.toEqual(new IntegrationFailure('token_exchange_failed'));
  });

  it('stores an encrypted long-lived token after verifying a professional account from Meta', async () => {
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: [{ access_token: 'short-test-token', permissions: INSTAGRAM_SCOPES.join(',') }] }))
      .mockResolvedValueOnce(response({ access_token: 'long-test-token', expires_in: 5183944 }))
      .mockResolvedValueOnce(response({ data: [{ user_id: config.expectedAccountId, username: config.expectedUsername, account_type: 'Media_Creator' }] }))
      .mockResolvedValueOnce(new Response('', { status: 201 }));
    await finishInstagramAuthorization(config, admin, 'sample-code');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(fetchMock.mock.calls[2][0])).not.toContain('long-test-token');
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization')).toBe('Bearer long-test-token');
    const saved = JSON.parse(String(fetchMock.mock.calls[3][1]?.body)) as { access_token_encrypted: string; scopes: string[]; status: string };
    expect(saved.access_token_encrypted).not.toContain('long-test-token');
    expect(await decryptSecret(saved.access_token_encrypted, key, 'instagram-access-token')).toBe('long-test-token');
    expect(saved.scopes).toEqual([...INSTAGRAM_SCOPES]);
    expect(saved.status).toBe('connected');
  });

  it('accepts a second professional account without trusting a browser-supplied account ID', async () => {
    const secondId = '17841426407669999';
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: [{ access_token: 'short-test-token', permissions: INSTAGRAM_SCOPES.join(',') }] }))
      .mockResolvedValueOnce(response({ access_token: 'long-test-token', expires_in: 5183944 }))
      .mockResolvedValueOnce(response({ user_id: secondId, username: 'second.account', account_type: 'Business' }))
      .mockResolvedValueOnce(new Response('', { status: 201 }));
    await finishInstagramAuthorization(config, admin, 'sample-code');
    const saved = JSON.parse(String(fetchMock.mock.calls[3][1]?.body)) as { instagram_user_id: string; username: string };
    expect(saved.instagram_user_id).toBe(secondId);
    expect(saved.username).toBe('second.account');
  });

  it('rejects a personal Instagram account', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: [{ access_token: 'short-test-token', permissions: INSTAGRAM_SCOPES.join(',') }] }))
      .mockResolvedValueOnce(response({ access_token: 'long-test-token', expires_in: 5183944 }))
      .mockResolvedValueOnce(response({ user_id: '17841426407669999', username: 'personal.account', account_type: 'Personal' }));
    await expect(finishInstagramAuthorization(config, admin, 'sample-code')).rejects.toMatchObject({ code: 'unexpected_account' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('never returns the credential in dashboard metadata', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(response([{
      id: 'row-id', owner_user_id: admin.userId, instagram_user_id: config.expectedAccountId,
      username: config.expectedUsername, account_type: 'Media_Creator', token_expires_at: null,
      scopes: [...INSTAGRAM_SCOPES], status: 'connected', connected_at: null, updated_at: '2026-09-25T00:00:00Z',
      access_token_encrypted: 'should-never-be-returned',
    }]));
    const metadata = await getConnection(config, admin.userId);
    expect(JSON.stringify(metadata)).not.toContain('should-never-be-returned');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('access_token_encrypted');
  });

  it('redirects an unauthenticated visitor away from admin integration', async () => {
    const request = new Request('https://localhost:3000/dashboard/integrations/instagram');
    await expect(requireAdmin(request, config)).rejects.toMatchObject({ status: 302 });
  });

  it('keeps database credentials inaccessible to browser roles in the migration', () => {
    const sql = readFileSync(new URL('../../../../supabase/migrations/20260925162636_instagram_oauth_connections.sql', import.meta.url), 'utf8');
    expect(sql).toMatch(/alter table public\.instagram_connections enable row level security/iu);
    expect(sql).toMatch(/alter table public\.instagram_oauth_states enable row level security/iu);
    expect(sql).toMatch(/revoke all on public\.instagram_connections from public, anon, authenticated/iu);
    expect(sql).toMatch(/grant select, insert, update, delete on public\.instagram_connections to service_role/iu);
    expect(sql).not.toMatch(/grant .*instagram_connections to authenticated/iu);
  });
});
