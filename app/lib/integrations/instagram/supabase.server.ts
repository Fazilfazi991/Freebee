import type { InstagramConfig } from './config.server';

export class IntegrationFailure extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

async function requestJson<T>(url: URL, init: RequestInit, failureCode: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: 'no-store', redirect: 'error' });
  } catch {
    throw new IntegrationFailure(failureCode);
  }
  if (!response.ok) throw new IntegrationFailure(failureCode);
  try {
    const body = await response.text();
    return body ? JSON.parse(body) as T : undefined as T;
  } catch {
    throw new IntegrationFailure(failureCode);
  }
}

function authUrl(config: InstagramConfig, path: string): URL {
  return new URL(`/auth/v1/${path}`, config.supabaseUrl);
}

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
};

export async function signIn(config: InstagramConfig, email: string, password: string): Promise<AuthSession> {
  const url = authUrl(config, 'token');
  url.searchParams.set('grant_type', 'password');
  const result = await requestJson<AuthSession>(url, {
    method: 'POST',
    headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, 'sign_in_failed');
  if (!result.access_token || !result.refresh_token) throw new IntegrationFailure('sign_in_failed');
  return result;
}

export async function refreshSession(config: InstagramConfig, refreshToken: string): Promise<AuthSession> {
  const url = authUrl(config, 'token');
  url.searchParams.set('grant_type', 'refresh_token');
  const result = await requestJson<AuthSession>(url, {
    method: 'POST',
    headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }, 'session_expired');
  if (!result.access_token || !result.refresh_token) throw new IntegrationFailure('session_expired');
  return result;
}

export async function getVerifiedUser(config: InstagramConfig, accessToken: string): Promise<{
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
}> {
  return requestJson(authUrl(config, 'user'), {
    headers: { apikey: config.publishableKey, Authorization: `Bearer ${accessToken}` },
  }, 'session_expired');
}

function restUrl(config: InstagramConfig, table: string): URL {
  return new URL(`/rest/v1/${table}`, config.supabaseUrl);
}

async function database<T>(config: InstagramConfig, url: URL, init: RequestInit, failureCode = 'database_unavailable'): Promise<T> {
  return requestJson<T>(url, {
    ...init,
    headers: {
      apikey: config.secretKey,
      Authorization: `Bearer ${config.secretKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  }, failureCode);
}

export type ConnectionRow = {
  id: string;
  owner_user_id: string;
  instagram_user_id: string;
  username: string;
  account_type: string;
  token_expires_at: string | null;
  scopes: string[];
  status: 'connected' | 'disconnected';
  connected_at: string | null;
  updated_at: string;
};

export async function getConnection(config: InstagramConfig, ownerUserId: string): Promise<ConnectionRow | null> {
  const url = restUrl(config, 'instagram_connections');
  url.searchParams.set('select', 'id,owner_user_id,instagram_user_id,username,account_type,token_expires_at,scopes,status,connected_at,updated_at');
  url.searchParams.set('owner_user_id', `eq.${ownerUserId}`);
  url.searchParams.set('instagram_user_id', `eq.${config.expectedAccountId}`);
  url.searchParams.set('limit', '1');
  const rows = await database<ConnectionRow[]>(config, url, { method: 'GET' });
  const row = rows[0];
  if (!row) return null;
  // Explicitly project metadata even if a future query accidentally selects the credential.
  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    instagram_user_id: row.instagram_user_id,
    username: row.username,
    account_type: row.account_type,
    token_expires_at: row.token_expires_at,
    scopes: row.scopes,
    status: row.status,
    connected_at: row.connected_at,
    updated_at: row.updated_at,
  };
}

// Server-only publishing access. Never return this row from a Remix loader or action.
export async function getEncryptedConnection(config: InstagramConfig, ownerUserId: string): Promise<(ConnectionRow & { access_token_encrypted: string | null }) | null> {
  const url = restUrl(config, 'instagram_connections');
  url.searchParams.set('select', 'id,owner_user_id,instagram_user_id,username,account_type,token_expires_at,scopes,status,connected_at,updated_at,access_token_encrypted');
  url.searchParams.set('owner_user_id', `eq.${ownerUserId}`);
  url.searchParams.set('instagram_user_id', `eq.${config.expectedAccountId}`);
  url.searchParams.set('limit', '1');
  const rows = await database<Array<ConnectionRow & { access_token_encrypted: string | null }>>(config, url, { method: 'GET' });
  return rows[0] ?? null;
}

export async function insertOAuthState(config: InstagramConfig, data: {
  stateHash: string;
  ownerUserId: string;
  sessionHash: string;
  expiresAt: string;
}): Promise<void> {
  await database(config, restUrl(config, 'instagram_oauth_states'), {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      state_hash: data.stateHash,
      owner_user_id: data.ownerUserId,
      session_hash: data.sessionHash,
      expires_at: data.expiresAt,
    }),
  });
}

export async function consumeOAuthState(config: InstagramConfig, data: {
  stateHash: string;
  ownerUserId: string;
  sessionHash: string;
  now: string;
}): Promise<boolean> {
  const url = restUrl(config, 'instagram_oauth_states');
  url.searchParams.set('state_hash', `eq.${data.stateHash}`);
  url.searchParams.set('owner_user_id', `eq.${data.ownerUserId}`);
  url.searchParams.set('session_hash', `eq.${data.sessionHash}`);
  url.searchParams.set('consumed_at', 'is.null');
  url.searchParams.set('expires_at', `gt.${data.now}`);
  url.searchParams.set('select', 'state_hash');
  const rows = await database<Array<{ state_hash: string }>>(config, url, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ consumed_at: data.now }),
  });
  return rows.length === 1;
}

export async function saveConnection(config: InstagramConfig, data: {
  ownerUserId: string;
  instagramUserId: string;
  username: string;
  accountType: string;
  encryptedToken: string;
  expiresAt: string;
  scopes: string[];
}): Promise<void> {
  const url = restUrl(config, 'instagram_connections');
  url.searchParams.set('on_conflict', 'owner_user_id,instagram_user_id');
  await database(config, url, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      owner_user_id: data.ownerUserId,
      instagram_user_id: data.instagramUserId,
      username: data.username,
      account_type: data.accountType,
      access_token_encrypted: data.encryptedToken,
      token_expires_at: data.expiresAt,
      scopes: data.scopes,
      status: 'connected',
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  }, 'connection_save_failed');
}

export async function disconnectConnection(config: InstagramConfig, ownerUserId: string): Promise<void> {
  const url = restUrl(config, 'instagram_connections');
  url.searchParams.set('owner_user_id', `eq.${ownerUserId}`);
  url.searchParams.set('instagram_user_id', `eq.${config.expectedAccountId}`);
  await database(config, url, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      access_token_encrypted: null,
      token_expires_at: null,
      status: 'disconnected',
      updated_at: new Date().toISOString(),
    }),
  });
}
