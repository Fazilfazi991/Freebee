import type { InstagramConfig } from './config.server';
import { sha256 } from './crypto.server';
import { getCurrentReelAttempt, insertReelAttempt, updateReelAttempt, type ReelAttempt } from './reel-db.server';
import { createReelContainer, getReelContainerStatus, publishReelContainer } from './reel-meta.server';
import { validatePublicMp4 } from './reel-url.server';
import { getConnection, IntegrationFailure } from './supabase.server';

function codeOf(error: unknown): string {
  return error instanceof IntegrationFailure ? error.code : 'unexpected_failure';
}

function validateCaption(input: string): string {
  const caption = input.trim();
  if (!caption || caption.length > 2200 || [...caption].some((character) => character.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(character))) {
    throw new IntegrationFailure('invalid_caption');
  }
  return caption;
}

export async function prepareTestReel(config: InstagramConfig, ownerId: string, sourceInput: string, captionInput: string): Promise<ReelAttempt> {
  const connection = await getConnection(config, ownerId);
  if (!connection || connection.status !== 'connected') throw new IntegrationFailure('account_disconnected');
  if (connection.instagram_user_id !== config.expectedAccountId || connection.username.toLowerCase() !== config.expectedUsername) {
    throw new IntegrationFailure('unexpected_account');
  }
  if (!connection.token_expires_at || Date.parse(connection.token_expires_at) <= Date.now()) throw new IntegrationFailure('token_expired');
  const current = await getCurrentReelAttempt(config, ownerId);
  if (current && current.status !== 'failed') throw new IntegrationFailure('already_prepared');
  const caption = validateCaption(captionInput);
  const sourceUrl = await validatePublicMp4(sourceInput);
  const attempt = await insertReelAttempt(config, {
    connectionId: connection.id, ownerId, sourceHost: new URL(sourceUrl).hostname,
    sourceUrlHash: await sha256(sourceUrl), caption,
  });
  let containerId: string;
  try {
    containerId = await createReelContainer(config, ownerId, sourceUrl, caption);
  } catch (error) {
    await updateReelAttempt(config, ownerId, attempt.id, ['pending'], { status: 'failed', failure_code: codeOf(error) });
    throw error;
  }
  const updated = await updateReelAttempt(config, ownerId, attempt.id, ['pending'], {
    status: 'container_created', container_id: containerId, container_status: 'IN_PROGRESS',
  });
  if (!updated) throw new IntegrationFailure('database_unavailable');
  return updated;
}

export async function checkTestReel(config: InstagramConfig, ownerId: string): Promise<ReelAttempt> {
  const attempt = await getCurrentReelAttempt(config, ownerId);
  if (!attempt?.container_id || !['container_created', 'processing', 'ready'].includes(attempt.status)) {
    throw new IntegrationFailure('nothing_to_check');
  }
  if (attempt.status === 'ready') return attempt;
  if (attempt.last_checked_at && Date.now() - Date.parse(attempt.last_checked_at) < 60_000) {
    throw new IntegrationFailure('check_too_soon');
  }
  if (attempt.status_checks >= 5) {
    await updateReelAttempt(config, ownerId, attempt.id, ['container_created', 'processing'], {
      status: 'failed', failure_code: 'processing_timeout',
    });
    throw new IntegrationFailure('processing_timeout');
  }
  const checks = attempt.status_checks + 1;
  // Record the check before contacting Meta so a network failure still counts toward the rate limit.
  const checking = await updateReelAttempt(config, ownerId, attempt.id, ['container_created', 'processing'], {
    last_checked_at: new Date().toISOString(), status_checks: checks,
  }, attempt.last_checked_at);
  if (!checking) throw new IntegrationFailure('check_too_soon');
  const status = await getReelContainerStatus(config, ownerId, attempt.container_id);
  const nextStatus = status === 'FINISHED' ? 'ready'
    : status === 'ERROR' || status === 'EXPIRED' || (status === 'IN_PROGRESS' && checks >= 5) ? 'failed'
      : status === 'PUBLISHED' ? 'publish_uncertain' : 'processing';
  const failure = status === 'ERROR' ? 'container_processing_error'
    : status === 'EXPIRED' ? 'container_expired'
      : status === 'IN_PROGRESS' && checks >= 5 ? 'processing_timeout'
        : status === 'PUBLISHED' ? 'published_without_media_id' : null;
  const updated = await updateReelAttempt(config, ownerId, attempt.id, ['container_created', 'processing'], {
    status: nextStatus, container_status: status, failure_code: failure,
  });
  if (!updated) throw new IntegrationFailure('database_unavailable');
  return updated;
}

export async function publishTestReel(config: InstagramConfig, ownerId: string, confirmation: string): Promise<ReelAttempt> {
  if (confirmation !== 'PUBLISH ONE REEL') throw new IntegrationFailure('publish_confirmation_required');
  const attempt = await getCurrentReelAttempt(config, ownerId);
  if (!attempt?.container_id || attempt.status !== 'ready' || attempt.container_status !== 'FINISHED') {
    throw new IntegrationFailure('not_ready_to_publish');
  }
  // Recheck Meta immediately before the irreversible request. A stale ready tab cannot publish an expired container.
  const status = await getReelContainerStatus(config, ownerId, attempt.container_id);
  if (status !== 'FINISHED') {
    await updateReelAttempt(config, ownerId, attempt.id, ['ready'], {
      status: status === 'IN_PROGRESS' ? 'processing' : status === 'PUBLISHED' ? 'publish_uncertain' : 'failed',
      container_status: status,
      failure_code: status === 'EXPIRED' ? 'container_expired' : status === 'ERROR' ? 'container_processing_error' : null,
    });
    throw new IntegrationFailure('not_ready_to_publish');
  }
  // Atomic compare-and-set: only one concurrent request may transition ready -> publishing.
  const claimed = await updateReelAttempt(config, ownerId, attempt.id, ['ready'], { status: 'publishing' });
  if (!claimed) throw new IntegrationFailure('duplicate_publish');
  let mediaId: string;
  try {
    mediaId = await publishReelContainer(config, ownerId, attempt.container_id);
  } catch (error) {
    await updateReelAttempt(config, ownerId, attempt.id, ['publishing'], {
      status: 'publish_uncertain', failure_code: codeOf(error),
    });
    throw error;
  }
  const published = await updateReelAttempt(config, ownerId, attempt.id, ['publishing'], {
    status: 'published', container_status: 'PUBLISHED', media_id: mediaId,
    published_at: new Date().toISOString(), failure_code: null,
  });
  if (!published) throw new IntegrationFailure('publish_record_failed');
  return published;
}
