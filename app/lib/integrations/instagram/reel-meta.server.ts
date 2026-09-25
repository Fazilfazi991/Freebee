import type { InstagramConfig } from './config.server';
import { decryptSecret } from './crypto.server';
import { getEncryptedConnection, getEncryptedInstagramAccount, IntegrationFailure } from './supabase.server';

const GRAPH_ROOT = 'https://graph.instagram.com/v26.0/';
const META_TIMEOUT_MS = 15000;

export type ContainerStatus = 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED';

function graphUrl(id: string, edge?: string): URL {
  if (!/^\d{10,25}$/u.test(id)) throw new IntegrationFailure('invalid_meta_response');
  return new URL(`${id}${edge ? `/${edge}` : ''}`, GRAPH_ROOT);
}

async function metaRequest<T>(url: URL, token: string, init: RequestInit, operation: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
      redirect: 'error',
      cache: 'no-store',
    });
  } catch { throw new IntegrationFailure(`${operation}_timeout`); }
  // Never parse or log an upstream error body; it may contain a credential or source URL.
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new IntegrationFailure('meta_permission_denied');
    if (response.status === 429) throw new IntegrationFailure('meta_rate_limited');
    throw new IntegrationFailure(response.status >= 500 ? `${operation}_server_error` : `${operation}_rejected`);
  }
  try { return await response.json() as T; }
  catch { throw new IntegrationFailure('invalid_meta_response'); }
}

export async function withPublishingToken<T>(config: InstagramConfig, ownerId: string, use: (token: string) => Promise<T>): Promise<T> {
  const connection = await getEncryptedConnection(config, ownerId);
  if (!connection || connection.status !== 'connected') throw new IntegrationFailure('account_disconnected');
  if (connection.instagram_user_id !== config.expectedAccountId || connection.username.toLowerCase() !== config.expectedUsername) {
    throw new IntegrationFailure('unexpected_account');
  }
  if (!connection.scopes.includes('instagram_business_content_publish')) throw new IntegrationFailure('meta_permission_denied');
  if (!connection.access_token_encrypted) throw new IntegrationFailure('missing_credential');
  if (!connection.token_expires_at || Date.parse(connection.token_expires_at) <= Date.now()) throw new IntegrationFailure('token_expired');
  let token: string;
  try { token = await decryptSecret(connection.access_token_encrypted, config.encryptionKey, 'instagram-access-token'); }
  catch { throw new IntegrationFailure('credential_decrypt_failed'); }
  if (!token) throw new IntegrationFailure('missing_credential');
  return use(token);
}

export async function createReelContainer(config: InstagramConfig, ownerId: string, videoUrl: string, caption: string): Promise<string> {
  return withPublishingToken(config, ownerId, async (token) => {
    const result = await metaRequest<{ id?: string }>(graphUrl(config.expectedAccountId, 'media'), token, {
      method: 'POST',
      body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: false }),
    }, 'container_create');
    if (!result.id || !/^\d{10,25}$/u.test(result.id)) throw new IntegrationFailure('invalid_meta_response');
    return result.id;
  });
}

export async function getReelContainerStatus(config: InstagramConfig, ownerId: string, containerId: string): Promise<ContainerStatus> {
  return withPublishingToken(config, ownerId, async (token) => {
    const url = graphUrl(containerId);
    url.searchParams.set('fields', 'status_code');
    const result = await metaRequest<{ status_code?: string }>(url, token, { method: 'GET' }, 'status_check');
    if (!result.status_code || !['IN_PROGRESS', 'FINISHED', 'ERROR', 'EXPIRED', 'PUBLISHED'].includes(result.status_code)) {
      throw new IntegrationFailure('invalid_meta_response');
    }
    return result.status_code as ContainerStatus;
  });
}

export async function publishReelContainer(config: InstagramConfig, ownerId: string, containerId: string): Promise<string> {
  return withPublishingToken(config, ownerId, async (token) => {
    const result = await metaRequest<{ id?: string }>(graphUrl(config.expectedAccountId, 'media_publish'), token, {
      method: 'POST', body: JSON.stringify({ creation_id: containerId }),
    }, 'publish');
    if (!result.id || !/^\d{10,25}$/u.test(result.id)) throw new IntegrationFailure('invalid_meta_response');
    return result.id;
  });
}

export async function getPublishingUsage(config: InstagramConfig, ownerId: string): Promise<{ used: number; total: number | null } | null> {
  return withPublishingToken(config, ownerId, async (token) => {
    const url = graphUrl(config.expectedAccountId, 'content_publishing_limit');
    url.searchParams.set('fields', 'quota_usage,config');
    const result = await metaRequest<{ data?: Array<{ quota_usage?: number; config?: { quota_total?: number } }> }>(
      url, token, { method: 'GET' }, 'quota_check',
    );
    const usage = result.data?.[0]?.quota_usage;
    const total = result.data?.[0]?.config?.quota_total;
    return typeof usage === 'number' && Number.isFinite(usage) && usage >= 0
      ? { used: usage, total: typeof total === 'number' && Number.isFinite(total) && total > 0 ? total : null }
      : null;
  });
}

// The control-center workflow uses the same proven Graph transport, selected by a
// server-verified connection UUID. A browser never supplies the Meta account ID.
export async function withAccountPublishingToken<T>(config: InstagramConfig, ownerId: string, accountId: string,
  use: (token: string, instagramUserId: string) => Promise<T>): Promise<T> {
  const account = await getEncryptedInstagramAccount(config, ownerId, accountId);
  if (!account || account.status !== 'connected') throw new IntegrationFailure('account_disconnected');
  if (!/^\d{10,25}$/u.test(account.instagram_user_id)) throw new IntegrationFailure('invalid_meta_response');
  if (!account.scopes.includes('instagram_business_content_publish')) throw new IntegrationFailure('meta_permission_denied');
  if (!account.access_token_encrypted) throw new IntegrationFailure('missing_credential');
  if (!account.token_expires_at || Date.parse(account.token_expires_at) <= Date.now()) throw new IntegrationFailure('token_expired');
  let token: string;
  try { token = await decryptSecret(account.access_token_encrypted, config.encryptionKey, 'instagram-access-token'); }
  catch { throw new IntegrationFailure('credential_decrypt_failed'); }
  if (!token) throw new IntegrationFailure('missing_credential');
  return use(token, account.instagram_user_id);
}

export async function getInstagramAccountInfo(config: InstagramConfig, ownerId: string, accountId: string): Promise<{
  userId: string; username: string; accountType: string;
}> {
  return withAccountPublishingToken(config, ownerId, accountId, async (token, instagramUserId) => {
    const url = new URL('me', GRAPH_ROOT);
    url.searchParams.set('fields', 'user_id,username,account_type');
    const profile = await metaRequest<{ user_id?: string; username?: string; account_type?: string }>(url, token, { method: 'GET' }, 'account_lookup');
    if (profile.user_id !== instagramUserId || !profile.username || !profile.account_type) throw new IntegrationFailure('unexpected_account');
    return { userId: profile.user_id, username: profile.username, accountType: profile.account_type };
  });
}

export async function createReelContainerForAccount(config: InstagramConfig, ownerId: string, accountId: string, input: {
  videoUrl: string; caption: string; shareToFeed: boolean; coverUrl?: string;
}): Promise<string> {
  return withAccountPublishingToken(config, ownerId, accountId, async (token, instagramUserId) => {
    const result = await metaRequest<{ id?: string }>(graphUrl(instagramUserId, 'media'), token, {
      method: 'POST', body: JSON.stringify({ media_type: 'REELS', video_url: input.videoUrl,
        caption: input.caption, share_to_feed: input.shareToFeed,
        ...(input.coverUrl ? { cover_url: input.coverUrl } : {}) }),
    }, 'container_create');
    if (!result.id || !/^\d{10,25}$/u.test(result.id)) throw new IntegrationFailure('invalid_meta_response');
    return result.id;
  });
}

export async function getReelContainerStatusForAccount(config: InstagramConfig, ownerId: string, accountId: string, containerId: string): Promise<ContainerStatus> {
  return withAccountPublishingToken(config, ownerId, accountId, async (token) => {
    const url = graphUrl(containerId);
    url.searchParams.set('fields', 'status_code');
    const result = await metaRequest<{ status_code?: string }>(url, token, { method: 'GET' }, 'status_check');
    if (!result.status_code || !['IN_PROGRESS', 'FINISHED', 'ERROR', 'EXPIRED', 'PUBLISHED'].includes(result.status_code)) {
      throw new IntegrationFailure('invalid_meta_response');
    }
    return result.status_code as ContainerStatus;
  });
}

export async function publishReelContainerForAccount(config: InstagramConfig, ownerId: string, accountId: string, containerId: string): Promise<string> {
  return withAccountPublishingToken(config, ownerId, accountId, async (token, instagramUserId) => {
    const result = await metaRequest<{ id?: string }>(graphUrl(instagramUserId, 'media_publish'), token, {
      method: 'POST', body: JSON.stringify({ creation_id: containerId }),
    }, 'publish');
    if (!result.id || !/^\d{10,25}$/u.test(result.id)) throw new IntegrationFailure('invalid_meta_response');
    return result.id;
  });
}
