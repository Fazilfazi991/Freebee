import type { Admin } from './admin-auth.server';
import type { InstagramConfig } from './config.server';
import { encryptSecret, randomUrlSafe, sha256 } from './crypto.server';
import { consumeOAuthState, insertOAuthState, IntegrationFailure, saveConnection } from './supabase.server';

export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'] as const;
const STATE_TTL_MS = 10 * 60 * 1000;

type ShortToken = { access_token: string; user_id?: string; permissions?: string | string[] };
type LongToken = { access_token: string; expires_in: number };
type Profile = { user_id: string; username: string; account_type: string };

async function metaJson<T>(url: URL, init: RequestInit, failureCode: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: 'no-store', redirect: 'error' });
  } catch {
    throw new IntegrationFailure(failureCode);
  }
  if (!response.ok) throw new IntegrationFailure(failureCode);
  try {
    return await response.json() as T;
  } catch {
    throw new IntegrationFailure(failureCode);
  }
}

function firstData<T>(value: T | { data: T[] }): T {
  if (value && typeof value === 'object' && 'data' in value) {
    const data = value.data;
    if (!Array.isArray(data) || !data[0]) throw new IntegrationFailure('invalid_meta_response');
    return data[0];
  }
  return value as T;
}

export async function beginInstagramAuthorization(config: InstagramConfig, admin: Admin, targetInstagramUserId?: string): Promise<string> {
  if (targetInstagramUserId && !/^\d{10,25}$/u.test(targetInstagramUserId)) throw new IntegrationFailure('unexpected_account');
  const state = randomUrlSafe();
  await insertOAuthState(config, {
    stateHash: await sha256(state),
    ownerUserId: admin.userId,
    sessionHash: await sha256(admin.sessionId),
    expiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    targetInstagramUserId,
  });
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', config.instagramAppId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', INSTAGRAM_SCOPES.join(','));
  url.searchParams.set('state', state);
  return url.toString();
}

export async function validateAndConsumeState(config: InstagramConfig, admin: Admin, state: string | null): Promise<string | null> {
  if (!state || !/^[A-Za-z0-9_-]{43}$/u.test(state)) throw new IntegrationFailure('invalid_state');
  const consumed = await consumeOAuthState(config, {
    stateHash: await sha256(state),
    ownerUserId: admin.userId,
    sessionHash: await sha256(admin.sessionId),
    now: new Date().toISOString(),
  });
  if (!consumed) throw new IntegrationFailure('invalid_state');
  return consumed.targetInstagramUserId;
}

async function exchangeCode(config: InstagramConfig, code: string): Promise<ShortToken> {
  const form = new FormData();
  form.set('client_id', config.instagramAppId);
  form.set('client_secret', config.instagramAppSecret);
  form.set('grant_type', 'authorization_code');
  form.set('redirect_uri', config.redirectUri);
  form.set('code', code);
  const value = await metaJson<ShortToken | { data: ShortToken[] }>(
    new URL('https://api.instagram.com/oauth/access_token'),
    { method: 'POST', body: form },
    'token_exchange_failed',
  );
  const token = firstData(value);
  if (!token.access_token) throw new IntegrationFailure('token_exchange_failed');
  const granted = typeof token.permissions === 'string' ? token.permissions.split(/[\s,]+/u) : token.permissions;
  if (!granted || !INSTAGRAM_SCOPES.every((scope) => granted.includes(scope))) {
    throw new IntegrationFailure('missing_permissions');
  }
  return token;
}

async function exchangeLongLived(config: InstagramConfig, shortToken: string): Promise<LongToken> {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', config.instagramAppSecret);
  url.searchParams.set('access_token', shortToken);
  const token = await metaJson<LongToken>(url, { method: 'GET' }, 'token_exchange_failed');
  if (!token.access_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
    throw new IntegrationFailure('token_exchange_failed');
  }
  return token;
}

async function getInstagramProfile(token: string): Promise<Profile> {
  const url = new URL('https://graph.instagram.com/v26.0/me');
  url.searchParams.set('fields', 'user_id,username,account_type');
  const value = await metaJson<Profile | { data: Profile[] }>(url, {
    method: 'GET', headers: { Authorization: `Bearer ${token}` },
  }, 'account_lookup_failed');
  const profile = firstData(value);
  if (!profile.user_id || !profile.username || !profile.account_type) throw new IntegrationFailure('account_lookup_failed');
  return profile;
}

export async function finishInstagramAuthorization(config: InstagramConfig, admin: Admin, code: string | null,
  targetInstagramUserId?: string | null): Promise<void> {
  if (!code || code.length > 4096) throw new IntegrationFailure('missing_code');
  const shortToken = await exchangeCode(config, code);
  const longToken = await exchangeLongLived(config, shortToken.access_token);
  const profile = await getInstagramProfile(longToken.access_token);
  const normalizedType = profile.account_type.toUpperCase();
  if (
    !/^\d{10,25}$/u.test(profile.user_id) ||
    !/^[A-Za-z0-9._]{1,30}$/u.test(profile.username) ||
    !['BUSINESS', 'MEDIA_CREATOR', 'CREATOR'].includes(normalizedType) ||
    (targetInstagramUserId && profile.user_id !== targetInstagramUserId)
  ) {
    throw new IntegrationFailure('unexpected_account');
  }
  await saveConnection(config, {
    ownerUserId: admin.userId,
    instagramUserId: profile.user_id,
    username: profile.username,
    accountType: profile.account_type,
    encryptedToken: await encryptSecret(longToken.access_token, config.encryptionKey, 'instagram-access-token'),
    expiresAt: new Date(Date.now() + longToken.expires_in * 1000).toISOString(),
    scopes: [...INSTAGRAM_SCOPES],
  });
}
