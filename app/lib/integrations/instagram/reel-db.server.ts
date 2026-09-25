import type { InstagramConfig } from './config.server';
import { IntegrationFailure } from './supabase.server';

export type ReelStatus = 'pending' | 'container_created' | 'processing' | 'ready' | 'publishing' | 'published' | 'failed' | 'publish_uncertain';
export type ReelAttempt = {
  id: string;
  instagram_connection_id: string;
  instagram_user_id: string;
  owner_user_id: string;
  created_by: string;
  source_host: string;
  source_url_sha256: string;
  caption: string;
  share_to_feed: boolean;
  container_id: string | null;
  container_status: string | null;
  media_id: string | null;
  status: ReelStatus;
  failure_code: string | null;
  status_checks: number;
  last_checked_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function attemptsUrl(config: InstagramConfig): URL {
  return new URL('/rest/v1/instagram_publish_attempts', config.supabaseUrl);
}

async function requestRows(config: InstagramConfig, url: URL, init: RequestInit): Promise<ReelAttempt[]> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        apikey: config.secretKey,
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...init.headers,
      },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
  } catch { throw new IntegrationFailure('database_unavailable'); }
  if (response.status === 409) throw new IntegrationFailure('already_prepared');
  if (!response.ok) throw new IntegrationFailure('database_unavailable');
  try {
    const rows = await response.json() as ReelAttempt[];
    if (!Array.isArray(rows)) throw new Error('bad rows');
    return rows;
  } catch { throw new IntegrationFailure('database_unavailable'); }
}

export async function getCurrentReelAttempt(config: InstagramConfig, ownerId: string): Promise<ReelAttempt | null> {
  const url = attemptsUrl(config);
  url.searchParams.set('select', 'id,instagram_connection_id,instagram_user_id,owner_user_id,created_by,source_host,source_url_sha256,caption,share_to_feed,container_id,container_status,media_id,status,failure_code,status_checks,last_checked_at,published_at,created_at,updated_at');
  url.searchParams.set('owner_user_id', `eq.${ownerId}`);
  url.searchParams.set('instagram_user_id', `eq.${config.expectedAccountId}`);
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', '1');
  return (await requestRows(config, url, { method: 'GET' }))[0] ?? null;
}

export async function insertReelAttempt(config: InstagramConfig, data: {
  connectionId: string; ownerId: string; sourceHost: string; sourceUrlHash: string; caption: string;
}): Promise<ReelAttempt> {
  const rows = await requestRows(config, attemptsUrl(config), {
    method: 'POST',
    body: JSON.stringify({
      instagram_connection_id: data.connectionId,
      instagram_user_id: config.expectedAccountId,
      owner_user_id: data.ownerId,
      created_by: data.ownerId,
      source_host: data.sourceHost,
      source_url_sha256: data.sourceUrlHash,
      caption: data.caption,
      share_to_feed: false,
      status: 'pending',
    }),
  });
  if (rows.length !== 1) throw new IntegrationFailure('database_unavailable');
  return rows[0];
}

export async function updateReelAttempt(config: InstagramConfig, ownerId: string, id: string, from: ReelStatus[], patch: Partial<ReelAttempt>, expectedLastCheckedAt?: string | null): Promise<ReelAttempt | null> {
  const url = attemptsUrl(config);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('owner_user_id', `eq.${ownerId}`);
  url.searchParams.set('instagram_user_id', `eq.${config.expectedAccountId}`);
  url.searchParams.set('status', `in.(${from.join(',')})`);
  if (expectedLastCheckedAt !== undefined) {
    url.searchParams.set('last_checked_at', expectedLastCheckedAt === null ? 'is.null' : `eq.${expectedLastCheckedAt}`);
  }
  const rows = await requestRows(config, url, {
    method: 'PATCH',
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows[0] ?? null;
}
