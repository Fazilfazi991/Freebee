import type { InstagramConfig } from './config.server';
import { createSignedContentDownload } from './content-storage.server';
import { createPublicationAttempt, getAssignment, getContent, getLatestPublicationAttempt,
  getPublishingSettings, updateAssignment, updatePublicationAttempt, type Assignment } from './control-db.server';
import { createReelContainerForAccount, getReelContainerStatusForAccount,
  publishReelContainerForAccount, type ContainerStatus } from './reel-meta.server';
import { getInstagramAccount, updateInstagramAccount, IntegrationFailure } from './supabase.server';

function codeOf(error: unknown): string {
  return error instanceof IntegrationFailure ? error.code : 'unexpected_failure';
}

async function assertAutomaticEnabled(config: InstagramConfig, accountId: string, ownerId: string): Promise<void> {
  const [settings, account] = await Promise.all([
    getPublishingSettings(config), getInstagramAccount(config, ownerId, accountId),
  ]);
  if (!settings.auto_publish || settings.pause_all || !account?.posting_enabled) {
    throw new IntegrationFailure('publishing_paused');
  }
}

export async function prepareInstagramPublication(config: InstagramConfig, ownerId: string, assignmentId: string,
  mode: 'manual' | 'automatic'): Promise<Assignment> {
  const assignment = await getAssignment(config, ownerId, assignmentId);
  if (!assignment || !['queued', 'scheduled'].includes(assignment.status)) throw new IntegrationFailure('not_ready_to_prepare');
  if (mode === 'automatic') await assertAutomaticEnabled(config, assignment.instagram_account_id, ownerId);
  const [content, account] = await Promise.all([
    getContent(config, ownerId, assignment.content_id),
    getInstagramAccount(config, ownerId, assignment.instagram_account_id),
  ]);
  if (!content || content.status !== 'ready' || !content.video_storage_path) throw new IntegrationFailure('content_not_ready');
  if (!account || account.status !== 'connected') throw new IntegrationFailure('account_disconnected');
  const claimed = await updateAssignment(config, ownerId, assignment.id, [assignment.status], {
    status: 'preparing', started_at: new Date().toISOString(),
    attempt_count: assignment.attempt_count + 1, last_error_code: null,
    last_error_summary: null, next_retry_at: null,
  }, assignment.updated_at);
  if (!claimed) throw new IntegrationFailure('duplicate_assignment');
  const attempt = await createPublicationAttempt(config, assignment.id, claimed.attempt_count);
  try {
    // Signed read URLs stay server-side and are sent only to Meta for this publication.
    const videoUrl = await createSignedContentDownload(config, content.video_storage_path, 7200);
    const coverUrl = assignment.cover_storage_path_snapshot
      ? await createSignedContentDownload(config, assignment.cover_storage_path_snapshot, 7200) : undefined;
    const containerId = await createReelContainerForAccount(config, ownerId, assignment.instagram_account_id, {
      videoUrl, coverUrl, caption: assignment.caption_snapshot, shareToFeed: assignment.share_to_feed,
    });
    const updated = await updateAssignment(config, ownerId, assignment.id, ['preparing'], {
      status: 'container_created', instagram_container_id: containerId, status_checks: 0,
    });
    await updatePublicationAttempt(config, attempt.id, { status: 'container_created', container_id: containerId });
    if (!updated) throw new IntegrationFailure('database_unavailable');
    return updated;
  } catch (error) {
    const code = codeOf(error);
    const uncertain = ['container_create_timeout', 'container_create_server_error', 'database_unavailable'].includes(code);
    await updateAssignment(config, ownerId, assignment.id, ['preparing'], {
      status: uncertain ? 'publish_uncertain' : 'failed', last_error_code: code,
      last_error_summary: uncertain ? 'Container outcome needs review.' : 'Container creation failed.',
    }).catch(() => undefined);
    await updatePublicationAttempt(config, attempt.id, {
      status: uncertain ? 'publish_uncertain' : 'failed', safe_error_code: code,
      finished_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}

export async function processInstagramPublication(config: InstagramConfig, ownerId: string, assignmentId: string): Promise<Assignment> {
  const assignment = await getAssignment(config, ownerId, assignmentId);
  if (!assignment?.instagram_container_id || !['container_created', 'processing', 'ready'].includes(assignment.status)) {
    throw new IntegrationFailure('nothing_to_check');
  }
  if (assignment.status === 'ready') return assignment;
  if (assignment.last_checked_at && Date.now() - Date.parse(assignment.last_checked_at) < 60_000) {
    throw new IntegrationFailure('check_too_soon');
  }
  if (assignment.next_retry_at && Date.parse(assignment.next_retry_at) > Date.now()) {
    throw new IntegrationFailure('check_too_soon');
  }
  if (assignment.status_checks >= 20) {
    await updateAssignment(config, ownerId, assignment.id, [assignment.status], {
      status: 'failed', last_error_code: 'processing_timeout',
      last_error_summary: 'Instagram did not finish processing after 20 status checks.',
    }, assignment.updated_at);
    const attempt = await getLatestPublicationAttempt(config, assignment.id);
    if (attempt) await updatePublicationAttempt(config, attempt.id, {
      status: 'failed', safe_error_code: 'processing_timeout', finished_at: new Date().toISOString(),
    });
    throw new IntegrationFailure('processing_timeout');
  }
  const claimed = await updateAssignment(config, ownerId, assignment.id,
    [assignment.status], { status_checks: assignment.status_checks + 1,
      last_checked_at: new Date().toISOString() }, assignment.updated_at);
  if (!claimed) throw new IntegrationFailure('check_too_soon');
  let status: ContainerStatus;
  try {
    status = await getReelContainerStatusForAccount(config, ownerId,
      assignment.instagram_account_id, assignment.instagram_container_id);
  } catch (error) {
    const code = codeOf(error);
    if (['status_check_timeout', 'status_check_server_error', 'meta_rate_limited'].includes(code)) {
      const minutes = Math.min(60, 2 ** Math.min(claimed.status_checks, 6));
      await updateAssignment(config, ownerId, assignment.id, ['container_created', 'processing'], {
        next_retry_at: new Date(Date.now() + minutes * 60_000).toISOString(),
        last_error_code: code, last_error_summary: 'Instagram status is temporarily unavailable. A later check is scheduled.',
      });
    }
    throw error;
  }
  const next = status === 'FINISHED' ? 'ready' : status === 'IN_PROGRESS' ? 'processing'
    : status === 'PUBLISHED' ? 'publish_uncertain' : 'failed';
  const failure = status === 'ERROR' ? 'container_processing_error'
    : status === 'EXPIRED' ? 'container_expired'
      : status === 'PUBLISHED' ? 'published_without_media_id' : null;
  const updated = await updateAssignment(config, ownerId, assignment.id,
    ['container_created', 'processing'], {
      status: next, last_error_code: failure, next_retry_at: null,
      last_error_summary: failure ? 'Instagram processing needs review.' : null,
    });
  if (!updated) throw new IntegrationFailure('database_unavailable');
  const attempt = await getLatestPublicationAttempt(config, assignment.id);
  if (attempt) await updatePublicationAttempt(config, attempt.id, {
    status: next, safe_error_code: failure,
    ...(next === 'failed' || next === 'publish_uncertain' ? { finished_at: new Date().toISOString() } : {}),
  });
  return updated;
}

export async function publishInstagramPublication(config: InstagramConfig, ownerId: string, assignmentId: string,
  mode: 'manual' | 'automatic'): Promise<Assignment> {
  const assignment = await getAssignment(config, ownerId, assignmentId);
  if (!assignment?.instagram_container_id || assignment.status !== 'ready') throw new IntegrationFailure('not_ready_to_publish');
  if (mode === 'automatic') await assertAutomaticEnabled(config, assignment.instagram_account_id, ownerId);
  // A stale ready row cannot publish a container that Meta has since expired.
  const status = await getReelContainerStatusForAccount(config, ownerId,
    assignment.instagram_account_id, assignment.instagram_container_id);
  if (status !== 'FINISHED') {
    await updateAssignment(config, ownerId, assignment.id, ['ready'], {
      status: status === 'IN_PROGRESS' ? 'processing' : status === 'PUBLISHED' ? 'publish_uncertain' : 'failed',
      last_error_code: status === 'PUBLISHED' ? 'published_without_media_id' : 'container_not_finished',
    });
    throw new IntegrationFailure('not_ready_to_publish');
  }
  const claimed = await updateAssignment(config, ownerId, assignment.id, ['ready'], { status: 'publishing' }, assignment.updated_at);
  if (!claimed) throw new IntegrationFailure('duplicate_publish');
  const attempt = await getLatestPublicationAttempt(config, assignment.id);
  if (attempt) await updatePublicationAttempt(config, attempt.id, { status: 'publishing' });
  let mediaId: string;
  try {
    mediaId = await publishReelContainerForAccount(config, ownerId,
      assignment.instagram_account_id, assignment.instagram_container_id);
  } catch (error) {
    const code = codeOf(error);
    await updateAssignment(config, ownerId, assignment.id, ['publishing'], {
      status: 'publish_uncertain', last_error_code: code,
      last_error_summary: 'Publish outcome requires manual review.',
    }).catch(() => undefined);
    if (attempt) await updatePublicationAttempt(config, attempt.id, {
      status: 'publish_uncertain', safe_error_code: code, finished_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw error;
  }
  const publishedAt = new Date().toISOString();
  const published = await updateAssignment(config, ownerId, assignment.id, ['publishing'], {
    status: 'published', instagram_media_id: mediaId, published_at: publishedAt,
    last_error_code: null, last_error_summary: null,
  });
  if (!published) throw new IntegrationFailure('publish_record_failed');
  if (attempt) await updatePublicationAttempt(config, attempt.id, {
    status: 'published', media_id: mediaId, finished_at: publishedAt,
  });
  await updateInstagramAccount(config, ownerId, assignment.instagram_account_id, { last_publish_at: publishedAt });
  return published;
}
